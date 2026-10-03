import { supabase } from '../lib/supabase';
import type { Edition, Team, TeamMember, TeamItem, Sponsor, GalleryPhoto } from '../types/database';

export const SAMPLE_EDITION_2025: Edition = {
  id: 'gcl-2025-archive',
  name: 'GenCode League 2025',
  year: 2025,
  is_current: false,
  is_archived: true,
  starting_budget: 50000000,
  total_rounds: 3,
  questions_per_round: 20,
  base_price: 2000000,
  min_increment: 1000000,
  champion_team_id: 'team-2025-1',
  runner_up_team_id: 'team-2025-2',
  third_place_team_id: 'team-2025-3',
  show_sponsors_on_certificates: true,
  created_at: '2025-10-14T09:00:00.000Z',
  archived_at: '2025-10-15T18:30:00.000Z',
};

export const SAMPLE_TEAMS_2025: Team[] = [
  {
    id: 'team-2025-1',
    edition_id: 'gcl-2025-archive',
    name: 'Binary Beasts',
    budget: 14000000,
    score: 280,
    status: 'active',
    sort_order: 1,
    created_at: '2025-10-14T09:30:00.000Z',
  },
  {
    id: 'team-2025-2',
    edition_id: 'gcl-2025-archive',
    name: 'Cyber Sentinels',
    budget: 8500000,
    score: 245,
    status: 'active',
    sort_order: 2,
    created_at: '2025-10-14T09:30:00.000Z',
  },
  {
    id: 'team-2025-3',
    edition_id: 'gcl-2025-archive',
    name: 'Algorithm Assassins',
    budget: 4000000,
    score: 215,
    status: 'active',
    sort_order: 3,
    created_at: '2025-10-14T09:30:00.000Z',
  },
  {
    id: 'team-2025-4',
    edition_id: 'gcl-2025-archive',
    name: 'Quantum Questers',
    budget: 12000000,
    score: 180,
    status: 'active',
    sort_order: 4,
    created_at: '2025-10-14T09:30:00.000Z',
  },
  {
    id: 'team-2025-5',
    edition_id: 'gcl-2025-archive',
    name: 'Neural Knights',
    budget: 16500000,
    score: 160,
    status: 'active',
    sort_order: 5,
    created_at: '2025-10-14T09:30:00.000Z',
  },
  {
    id: 'team-2025-6',
    edition_id: 'gcl-2025-archive',
    name: 'Syntax Strikers',
    budget: 7000000,
    score: 140,
    status: 'active',
    sort_order: 6,
    created_at: '2025-10-14T09:30:00.000Z',
  },
];

export const SAMPLE_MEMBERS_2025: TeamMember[] = [
  // Binary Beasts
  {
    id: 'mem-2025-1',
    team_id: 'team-2025-1',
    full_name: 'Arjun Sharma',
    name: 'Arjun Sharma',
    role: 'Captain',
    usn: '1RV22CS034',
    college: 'RV College of Engineering',
    department: 'CSE',
    semester: '6',
    email: 'arjun.s@rvce.edu.in',
    phone: '+91 98450 11223',
    created_at: '2025-10-14T10:00:00.000Z',
  },
  {
    id: 'mem-2025-2',
    team_id: 'team-2025-1',
    full_name: 'Priya Nair',
    name: 'Priya Nair',
    role: 'Core Developer',
    usn: '1RV22CS088',
    college: 'RV College of Engineering',
    department: 'CSE',
    semester: '6',
    email: 'priya.n@rvce.edu.in',
    phone: '+91 98450 44556',
    created_at: '2025-10-14T10:00:00.000Z',
  },
  {
    id: 'mem-2025-3',
    team_id: 'team-2025-1',
    full_name: 'Rohan Verma',
    name: 'Rohan Verma',
    role: 'Algorithms Specialist',
    usn: '1RV22IS042',
    college: 'RV College of Engineering',
    department: 'ISE',
    semester: '6',
    email: 'rohan.v@rvce.edu.in',
    phone: '+91 98450 77889',
    created_at: '2025-10-14T10:00:00.000Z',
  },

  // Cyber Sentinels
  {
    id: 'mem-2025-4',
    team_id: 'team-2025-2',
    full_name: 'Sneha Kulkarni',
    name: 'Sneha Kulkarni',
    role: 'Captain',
    usn: '1BM22CS112',
    college: 'BMS College of Engineering',
    department: 'CSE',
    semester: '6',
    email: 'sneha.k@bmsce.ac.in',
    phone: '+91 98860 12345',
    created_at: '2025-10-14T10:00:00.000Z',
  },
  {
    id: 'mem-2025-5',
    team_id: 'team-2025-2',
    full_name: 'Aditya Rao',
    name: 'Aditya Rao',
    role: 'Systems Architect',
    usn: '1BM22CS009',
    college: 'BMS College of Engineering',
    department: 'CSE',
    semester: '6',
    email: 'aditya.r@bmsce.ac.in',
    phone: '+91 98860 67890',
    created_at: '2025-10-14T10:00:00.000Z',
  },

  // Algorithm Assassins
  {
    id: 'mem-2025-6',
    team_id: 'team-2025-3',
    full_name: 'Dev Patel',
    name: 'Dev Patel',
    role: 'Captain',
    usn: '1PE22CS045',
    college: 'PES University',
    department: 'CSE',
    semester: '6',
    email: 'dev.p@pes.edu',
    phone: '+91 99000 11234',
    created_at: '2025-10-14T10:00:00.000Z',
  },
  {
    id: 'mem-2025-7',
    team_id: 'team-2025-3',
    full_name: 'Aisha Khan',
    name: 'Aisha Khan',
    role: 'Lead Strategist',
    usn: '1PE22AI019',
    college: 'PES University',
    department: 'AIML',
    semester: '6',
    email: 'aisha.k@pes.edu',
    phone: '+91 99000 55678',
    created_at: '2025-10-14T10:00:00.000Z',
  },
];

export const SAMPLE_SPONSORS_2025: Sponsor[] = [
  {
    id: 'spons-2025-1',
    edition_id: 'gcl-2025-archive',
    name: 'Google Cloud',
    tier: 'Title Sponsor',
    logo_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=200&fit=crop&q=80',
    website_url: 'https://cloud.google.com',
    sort_order: 1,
  },
  {
    id: 'spons-2025-2',
    edition_id: 'gcl-2025-archive',
    name: 'GitHub Education',
    tier: 'Gold Partner',
    logo_url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=200&fit=crop&q=80',
    website_url: 'https://education.github.com',
    sort_order: 2,
  },
  {
    id: 'spons-2025-3',
    edition_id: 'gcl-2025-archive',
    name: 'JetBrains',
    tier: 'Gold Partner',
    logo_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=200&fit=crop&q=80',
    website_url: 'https://www.jetbrains.com',
    sort_order: 3,
  },
  {
    id: 'spons-2025-4',
    edition_id: 'gcl-2025-archive',
    name: 'Red Bull',
    tier: 'Energy Partner',
    logo_url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=200&fit=crop&q=80',
    website_url: 'https://www.redbull.com',
    sort_order: 4,
  },
];

export const SAMPLE_GALLERY_PHOTOS_2025: GalleryPhoto[] = [
  {
    id: 'photo-2025-1',
    edition_id: 'gcl-2025-archive',
    segment: 'Winner Ceremony',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&fit=crop&q=80',
    caption: 'Binary Beasts lifting the GCL 2025 Champion Trophy',
    uploaded_at: '2025-10-15T19:00:00.000Z',
  },
  {
    id: 'photo-2025-2',
    edition_id: 'gcl-2025-archive',
    segment: 'Live Auction',
    image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&fit=crop&q=80',
    caption: 'Intense bidding wars during Round 3 High-Stakes Auction',
    uploaded_at: '2025-10-15T16:20:00.000Z',
  },
  {
    id: 'photo-2025-3',
    edition_id: 'gcl-2025-archive',
    segment: 'Opening Ceremony',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&fit=crop&q=80',
    caption: 'Stage illumination and league kickoff in the main auditorium',
    uploaded_at: '2025-10-15T10:00:00.000Z',
  },
  {
    id: 'photo-2025-4',
    edition_id: 'gcl-2025-archive',
    segment: 'Live Auction',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&fit=crop&q=80',
    caption: 'Team strategists analyzing budget allocation before bidding',
    uploaded_at: '2025-10-15T14:10:00.000Z',
  },
];

export const SAMPLE_ITEMS_2025: TeamItem[] = [
  {
    id: 'item-2025-1',
    edition_id: 'gcl-2025-archive',
    team_id: 'team-2025-1',
    item_name: 'Distributed Consensus & Raft Protocol Implementation',
    cost: 12000000,
    is_correct: true,
    round_index: 2,
    question_index: 18,
    question_ref: 'Round 3 • Question 19',
    created_at: '2025-10-15T17:00:00.000Z',
  },
  {
    id: 'item-2025-2',
    edition_id: 'gcl-2025-archive',
    team_id: 'team-2025-1',
    item_name: 'V8 Garbage Collection & Generational Heap Optimizations',
    cost: 8000000,
    is_correct: true,
    round_index: 1,
    question_index: 14,
    question_ref: 'Round 2 • Question 15',
    created_at: '2025-10-15T14:40:00.000Z',
  },
  {
    id: 'item-2025-3',
    edition_id: 'gcl-2025-archive',
    team_id: 'team-2025-2',
    item_name: 'B-Tree Index Balancing & InnoDB Storage Architecture',
    cost: 11000000,
    is_correct: true,
    round_index: 2,
    question_index: 12,
    question_ref: 'Round 3 • Question 13',
    created_at: '2025-10-15T16:30:00.000Z',
  },
  {
    id: 'item-2025-4',
    edition_id: 'gcl-2025-archive',
    team_id: 'team-2025-3',
    item_name: 'Zero-Knowledge Proofs & zk-SNARK Verification Protocol',
    cost: 15000000,
    is_correct: true,
    round_index: 2,
    question_index: 19,
    question_ref: 'Round 3 • Question 20',
    created_at: '2025-10-15T17:25:00.000Z',
  },
];

/**
 * Seeds or restores the official GCL 2025 Demo Edition into Supabase
 */
export async function seedSampleEdition(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Upsert Edition
    const { error: edErr } = await supabase
      .from('editions')
      .upsert(SAMPLE_EDITION_2025, { onConflict: 'id' });
    if (edErr) throw edErr;

    // 2. Upsert Teams
    const { error: tmErr } = await supabase
      .from('teams')
      .upsert(SAMPLE_TEAMS_2025, { onConflict: 'id' });
    if (tmErr) throw tmErr;

    // 3. Upsert Members
    const { error: memErr } = await supabase
      .from('team_members')
      .upsert(SAMPLE_MEMBERS_2025, { onConflict: 'id' });
    if (memErr) throw memErr;

    // 4. Upsert Items
    const { error: itemErr } = await supabase
      .from('team_items')
      .upsert(SAMPLE_ITEMS_2025, { onConflict: 'id' });
    if (itemErr) throw itemErr;

    // 5. Upsert Sponsors
    const { error: spErr } = await supabase
      .from('sponsors')
      .upsert(SAMPLE_SPONSORS_2025, { onConflict: 'id' });
    if (spErr) throw spErr;

    // 6. Upsert Gallery Photos
    const { error: gpErr } = await supabase
      .from('gallery_photos')
      .upsert(SAMPLE_GALLERY_PHOTOS_2025, { onConflict: 'id' });
    if (gpErr) throw gpErr;

    return {
      success: true,
      message: 'Successfully seeded GCL 2025 Sample Edition with teams, podium, sponsors, and gallery records!',
    };
  } catch (err: any) {
    console.error('Error seeding sample edition:', err);
    return {
      success: false,
      message: err?.message || 'Failed to seed sample edition.',
    };
  }
}
