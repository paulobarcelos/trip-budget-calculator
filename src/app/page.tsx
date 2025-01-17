import Link from 'next/link';

export default function Home() {
  return (
    <div className="prose lg:prose-xl mx-auto">
      <h1>Trip Budget Calculator</h1>
      <p>
        Welcome to Trip Budget Calculator! This tool helps you manage and split expenses
        during trips where people may join or leave at different dates.
      </p>
      
      <h2>Getting Started</h2>
      <ol>
        <li>
          <Link href="/setup">Set up your trip dates and currency</Link>
        </li>
        <li>
          <Link href="/travelers">Add travelers and their dates</Link>
        </li>
        <li>
          <Link href="/expenses">Add your expenses</Link>
        </li>
        <li>
          <Link href="/usage">Track who uses what</Link>
        </li>
        <li>
          <Link href="/budget">View the budget summary</Link>
        </li>
      </ol>

      <h2>Features</h2>
      <ul>
        <li>Handle travelers joining/leaving at different dates</li>
        <li>Track shared and personal expenses</li>
        <li>Support for daily and one-time expenses</li>
        <li>Fair cost splitting based on actual usage</li>
        <li>Currency conversion support</li>
      </ul>
    </div>
  );
}
