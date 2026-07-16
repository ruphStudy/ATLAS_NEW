import { redirect } from 'next/navigation';

// Root redirects to dashboard
// Authentication guard will intercept this in middleware when implemented
export default function HomePage() {
  redirect('/dashboard');
}
