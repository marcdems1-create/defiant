import { redirect } from 'next/navigation';

/** Browse lives on Collection (`/`). Keep `/opportunities/[id]` for card pages. */
export default function OpportunitiesPage() {
  redirect('/');
}
