import { supabase } from '../lib/supabase';
import type { Edition, GalleryPhoto, LandingSettings, Person } from '../types/database';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadMediaFile(file: File, folder = 'media'): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File exceeds maximum size limit of 5 MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${cleanExt}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('gallery')
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

export interface LandingContentPodiumEntry {
  id?: string;
  name: string;
  lots: number;
  amount: number;
  photo_url?: string | null;
}

export interface LandingContent {
  settings: LandingSettings;
  people: Person[];
  featuredGallery: GalleryPhoto[];
  podium: {
    edition: Edition | null;
    champion: LandingContentPodiumEntry | null;
    runnerUp: LandingContentPodiumEntry | null;
    thirdPlace: LandingContentPodiumEntry | null;
  };
}

// ── Public Read: Landing Content ──
export async function getLandingContent(): Promise<LandingContent> {
  // 1. Settings
  let settings: LandingSettings = {
    id: '',
    hero_image_url: null,
    edition_label: 'GCL 2026',
  };

  const { data: settingsData } = await supabase
    .from('landing_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (settingsData) {
    settings = settingsData;
  }

  // 2. Published People (sorted by sort_order)
  const { data: peopleData } = await supabase
    .from('people')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  const people: Person[] = (peopleData || []).filter(
    (p) => (p.name && p.name.trim()) || (p.photo_url && p.photo_url.trim())
  );

  // 3. Featured Gallery Photos: Both landing carousel and /gallery read gallery_items
  let galleryData: any[] | null = null;
  const resItems = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .limit(12);

  if (!resItems.error && resItems.data && resItems.data.length > 0) {
    galleryData = resItems.data;
  } else {
    const resPhotos = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .limit(12);
    if (!resPhotos.error && resPhotos.data) {
      galleryData = resPhotos.data;
    }
  }

  const featuredGallery: GalleryPhoto[] = (galleryData || []).map((item) => ({
    ...item,
    photo_url: item.photo_url || item.image_url || '',
    title: item.title ?? item.caption ?? '',
    accent: item.accent || '#180a0f',
    credit: item.credit ?? '',
    description: item.description || null,
    meta: Array.isArray(item.meta) ? item.meta : [],
  }));

  // 4. Latest Edition Champions & Podium
  let edition: Edition | null = null;
  let champion: LandingContentPodiumEntry | null = null;
  let runnerUp: LandingContentPodiumEntry | null = null;
  let thirdPlace: LandingContentPodiumEntry | null = null;

  // Try to find edition with podium teams or the latest archived/current edition
  const { data: editionsList } = await supabase
    .from('editions')
    .select(`
      *,
      champion:teams!editions_champion_team_id_fkey(id, name, budget),
      runnerUp:teams!editions_runner_up_team_id_fkey(id, name, budget),
      thirdPlace:teams!editions_third_place_team_id_fkey(id, name, budget)
    `)
    .order('year', { ascending: false });

  if (editionsList && editionsList.length > 0) {
    // Pick the latest edition that has champion_team_id or the first one
    const targetEdition =
      editionsList.find((e) => e.champion_team_id) || editionsList[0];
    edition = targetEdition;

    if (edition) {
      const editionId = edition.id;
      const teamIds = [
        edition.champion_team_id,
        edition.runner_up_team_id,
        edition.third_place_team_id,
      ].filter(Boolean) as string[];

      // Fetch team purchases to calculate lots and amount spent
      let itemsByTeam: Record<string, { lots: number; amount: number }> = {};

      if (teamIds.length > 0) {
        const { data: teamItems } = await supabase
          .from('team_items')
          .select('team_id, cost')
          .eq('edition_id', editionId)
          .in('team_id', teamIds);

        if (teamItems) {
          teamItems.forEach((it) => {
            if (!itemsByTeam[it.team_id]) {
              itemsByTeam[it.team_id] = { lots: 0, amount: 0 };
            }
            itemsByTeam[it.team_id].lots += 1;
            itemsByTeam[it.team_id].amount += it.cost || 0;
          });
        }
      }

      if (edition.champion_team_id) {
        const champTeam = (edition as any).champion;
        const stats = itemsByTeam[edition.champion_team_id] || { lots: 0, amount: 0 };
        champion = {
          id: edition.champion_team_id,
          name: champTeam?.name || 'Champion Team',
          lots: stats.lots,
          amount: stats.amount,
          photo_url: edition.champion_photo_url || null,
        };
      }

      if (edition.runner_up_team_id) {
        const runTeam = (edition as any).runnerUp;
        const stats = itemsByTeam[edition.runner_up_team_id] || { lots: 0, amount: 0 };
        runnerUp = {
          id: edition.runner_up_team_id,
          name: runTeam?.name || 'Runner Up',
          lots: stats.lots,
          amount: stats.amount,
          photo_url: edition.runner_up_photo_url || null,
        };
      }

      if (edition.third_place_team_id) {
        const thirdTeam = (edition as any).thirdPlace;
        const stats = itemsByTeam[edition.third_place_team_id] || { lots: 0, amount: 0 };
        thirdPlace = {
          id: edition.third_place_team_id,
          name: thirdTeam?.name || 'Third Place',
          lots: stats.lots,
          amount: stats.amount,
          photo_url: edition.third_place_photo_url || null,
        };
      }
    }
  }

  return {
    settings,
    people,
    featuredGallery,
    podium: {
      edition,
      champion,
      runnerUp,
      thirdPlace,
    },
  };
}

// ── Public Read: Gallery Items ──
export interface GetGalleryPhotosParams {
  tag?: string;
  editionId?: string;
  page?: number;
  pageSize?: number;
}

export async function getPublicGalleryItems({
  tag,
  editionId,
  page = 1,
  pageSize = 24,
}: GetGalleryPhotosParams = {}) {
  let query = supabase
    .from('gallery_photos')
    .select(
      `
      *,
      edition:editions(id, name, year)
    `,
      { count: 'exact' }
    )
    .eq('is_published', true);

  if (editionId && editionId !== 'all') {
    query = query.eq('edition_id', editionId);
  }

  if (tag && tag !== 'all' && tag !== 'All') {
    query = query.or(`tag.ilike.%${tag}%,segment.ilike.%${tag}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order('sort_order', { ascending: true })
    .order('uploaded_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const items: GalleryPhoto[] = (data || []).map((item) => ({
    ...item,
    title: item.title ?? item.caption ?? '',
    accent: item.accent || '#180a0f',
    credit: item.credit ?? '',
    description: item.description || null,
    meta: Array.isArray(item.meta) ? item.meta : [],
    tag: item.tag || item.segment || 'General',
  }));

  return {
    items,
    total: count || 0,
    page,
    pageSize,
    hasMore: count ? from + items.length < count : false,
  };
}

// ── Admin Read & Writes ──
export async function getAdminLandingContent() {
  const { data: settings } = await supabase
    .from('landing_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .order('sort_order', { ascending: true });

  const { data: editions } = await supabase
    .from('editions')
    .select(`
      *,
      champion:teams!editions_champion_team_id_fkey(id, name),
      runnerUp:teams!editions_runner_up_team_id_fkey(id, name),
      thirdPlace:teams!editions_third_place_team_id_fkey(id, name)
    `)
    .order('year', { ascending: false });

  const { data: galleryPhotos } = await supabase
    .from('gallery_photos')
    .select(`
      *,
      edition:editions(id, name, year)
    `)
    .order('sort_order', { ascending: true })
    .order('uploaded_at', { ascending: false });

  return {
    settings: settings || { id: '', hero_image_url: null, edition_label: 'GCL 2025' },
    people: (people || []) as Person[],
    editions: (editions || []) as Edition[],
    galleryPhotos: (galleryPhotos || []) as GalleryPhoto[],
  };
}

export async function saveLandingSettings(settings: Partial<LandingSettings>) {
  if (settings.id) {
    const { error } = await supabase
      .from('landing_settings')
      .update({
        hero_image_url: settings.hero_image_url,
        edition_label: settings.edition_label || 'GCL 2025',
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('landing_settings')
      .insert({
        hero_image_url: settings.hero_image_url,
        edition_label: settings.edition_label || 'GCL 2025',
      });
    if (error) throw error;
  }
}

export async function savePerson(person: Partial<Person>) {
  const payload: any = {
    role_label: person.role_label ?? '',
    name: person.name ?? '',
    photo_url: person.photo_url ? person.photo_url : null,
    sort_order: person.sort_order ?? 0,
    is_published: person.is_published ?? true,
    category: person.category || 'leadership',
    group_name: person.group_name || '',
  };

  if (person.id && !person.id.startsWith('temp-')) {
    const { data, error } = await supabase
      .from('people')
      .update(payload)
      .eq('id', person.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('people')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deletePerson(id: string) {
  if (id.startsWith('temp-')) return;
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function savePeopleBatch(peopleList: Person[]) {
  const results: Person[] = [];
  for (const p of peopleList) {
    const saved = await savePerson(p);
    results.push(saved || p);
  }
  return results;
}

export async function saveEditionChampionPhotos(
  editionId: string,
  photos: {
    champion_photo_url?: string | null;
    runner_up_photo_url?: string | null;
    third_place_photo_url?: string | null;
  }
) {
  const { error } = await supabase
    .from('editions')
    .update({
      champion_photo_url: photos.champion_photo_url,
      runner_up_photo_url: photos.runner_up_photo_url,
      third_place_photo_url: photos.third_place_photo_url,
    })
    .eq('id', editionId);
  if (error) throw error;
}

export async function saveGalleryPhoto(item: Partial<GalleryPhoto>) {
  if (item.id) {
    const { error } = await supabase
      .from('gallery_photos')
      .update({
        title: item.title ?? '',
        credit: item.credit ?? '',
        description: item.description ?? null,
        meta: item.meta || [],
        accent: item.accent || '#180a0f',
        tag: item.tag || item.segment || 'General',
        segment: item.tag || item.segment || 'General',
        edition_id: item.edition_id || null,
        is_featured: item.is_featured ?? false,
        sort_order: item.sort_order ?? 0,
        is_published: item.is_published ?? true,
      })
      .eq('id', item.id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('gallery_photos')
      .insert({
        image_url: item.image_url!,
        title: item.title ?? '',
        caption: item.title ?? '',
        credit: item.credit ?? '',
        description: item.description ?? null,
        meta: item.meta || [],
        accent: item.accent || '#180a0f',
        tag: item.tag || 'General',
        segment: item.tag || 'General',
        edition_id: item.edition_id || null,
        is_featured: item.is_featured ?? false,
        sort_order: item.sort_order ?? 0,
        is_published: item.is_published ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteGalleryPhoto(id: string) {
  const { error } = await supabase.from('gallery_photos').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkPublishGalleryPhotos(ids: string[], isPublished: boolean) {
  const { error } = await supabase
    .from('gallery_photos')
    .update({ is_published: isPublished })
    .in('id', ids);
  if (error) throw error;
}

export async function bulkDeleteGalleryPhotos(ids: string[]) {
  const { error } = await supabase.from('gallery_photos').delete().in('id', ids);
  if (error) throw error;
}
