import { supabase } from '../lib/supabase';
import type { FaqEntry } from '../types/database';

export const DEFAULT_FAQS: FaqEntry[] = [
  {
    id: 'faq-1',
    question: 'What is Gen Code League (GCL)?',
    answer:
      'Gen Code League (GCL) is an elite competitive technical league that combines high-speed computer science problem solving with live strategic auction mechanics. Teams manage virtual crore budgets to bid on, acquire, and answer rigorous engineering questions across multiple rounds, competing for podium glory and official accreditation.',
    sort_order: 1,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-2',
    question: 'How does the Live Technical Auction bidding mechanic work?',
    answer:
      'Each question is presented live on the arena stage with an opening base price. Teams place real-time competitive bids using their allocated budget. Bids must meet or exceed the current bid plus the minimum increment (₹10,00,000). When the countdown timer expires or the auctioneer calls the final hammer, the highest bidding team wins the right to answer the question for maximum points.',
    sort_order: 2,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-3',
    question: 'What are the rounds and question difficulty levels in GCL?',
    answer:
      'A standard GCL edition comprises three primary phases plus a Tie-Breaker: Round 1 (Foundations & Core CS Concepts), Round 2 (Algorithms, Data Structures & Relational Databases), and Round 3 (Distributed Systems, Concurrency & High-Stakes Architecture). Higher rounds feature higher base prices and substantially larger point values.',
    sort_order: 3,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-4',
    question: 'How is team budget allocated and carried over between rounds?',
    answer:
      'Every team begins Round 1 with the edition starting budget (default ₹5,00,00,000). In Round 1, budgets decrease with each winning bid. In Round 2, unspent budget carries over according to league rules. In Round 3, teams receive their fresh round allocation plus their accrued Round 2 surplus, rewarding disciplined financial strategy.',
    sort_order: 4,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-5',
    question: 'What happens when the bid timer expires?',
    answer:
      'When the timer reaches 00:00, active bidding automatically freezes. The admin or auctioneer confirms the winning team and verifies their answer. If answered correctly, the team receives full points and the item is permanently recorded in their portfolio. If unsold or passed, the item is archived and play advances to the next question.',
    sort_order: 5,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-6',
    question: 'How does the Leaderboard Reveal and Podium ceremony work?',
    answer:
      'To build suspense, Round 1 leaderboard standings can be revealed position-by-position from bottom to top. At the conclusion of Round 3, the stage enters Finale Mode, unveiling the official 3rd Place bronze medalist, 2nd Place runner-up, and the Grand Champion with confetti celebrations and ceremony fanfare.',
    sort_order: 6,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-7',
    question: 'How do participants download and cryptographically verify certificates?',
    answer:
      'All participants, winners, and coordinators receive official GCL certificates with unique cryptographically generated IDs and verification QR codes. Anyone can verify certificate authenticity in real time by scanning the QR code or searching by student name/USN at the Certificate Portal (/my-certificates) or Verification Gateway (/verify-certificate).',
    sort_order: 7,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-8',
    question: 'Can team rosters and member names be modified after the event begins?',
    answer:
      'Yes. Administrators have 24/7 access to the Team Management workstation in the Admin Console. Admins can register new teams, rename existing teams, add or remove participant names, and calibrate budgets even while an auction is in progress. All roster changes automatically sync with certificate generation.',
    sort_order: 8,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-9',
    question: 'What are the bidding increments and base prices?',
    answer:
      'Base prices are calibrated per round (typically ₹20,00,000 in early rounds, scaling higher in advanced rounds). The standard minimum bid increment is ₹10,00,000 (10 Lakhs). Teams may bid higher in custom multiples as permitted by the live auctioneer.',
    sort_order: 9,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-10',
    question: 'What is the Tie Breaker procedure?',
    answer:
      'If two or more teams tie for a podium position at the end of Round 3, the system activates the Tie Breaker protocol. Teams compete in a sudden-death bidding face-off on curated algorithmic challenges until the deadlock is resolved.',
    sort_order: 10,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-11',
    question: 'Where can I explore previous GCL champions, photos, and sponsors?',
    answer:
      'Visit the Hall of Fame (/hall-of-fame) to explore historical champions and team records across all past seasons. The official Event Gallery (/gallery) showcases high-resolution photo highlights from opening ceremonies to stage awards.',
    sort_order: 11,
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'faq-12',
    question: 'How are official updates and announcements communicated during the event?',
    answer:
      'Official league arbiters publish real-time broadcast notices through the Admin Broadcast Studio. Participants and spectators can view all live updates, schedule announcements, and urgent rule clarifications on the Updates page (/announcements).',
    sort_order: 12,
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

/**
 * Seeds the standard GCL FAQs into the database
 */
export async function seedFaqs(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('faq_entries')
      .upsert(DEFAULT_FAQS, { onConflict: 'id' });

    if (error) throw error;
    return { success: true, message: `Successfully seeded ${DEFAULT_FAQS.length} official GCL FAQs!` };
  } catch (err: any) {
    console.error('Error seeding FAQs:', err);
    return { success: false, message: err?.message || 'Failed to seed FAQs.' };
  }
}
