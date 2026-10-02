import Link from "next/link";
import {
  ArrowRight,
  Search,
  Phone,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { SearchForm } from "@/components/search";
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            Connecting people across Bangladesh
          </div>
          <h1>
            Find blood donors.
            <br />
            <span>Give life a chance.</span>
          </h1>
          <p className="lead">
            When every moment matters, finding a donor should be simple. Connect
            directly with people willing to help, near you.
          </p>
          <Link className="text-link" href="/register">
            Become a donor. Be someone’s hope.
            <ArrowRight size={18} />
          </Link>
          <div className="trust">
            <ShieldCheck size={19} />
            <span>Free to search. No account needed.</span>
          </div>
        </div>
        <SearchForm compact />
      </section>
      <section className="how">
        <div className="section-title">
          <span className="eyebrow">A simple way to help</span>
          <h2>A connection that can make a difference.</h2>
          <p>Find the right blood group and reach out directly.</p>
        </div>
        <div className="steps">
          {[
            {
              icon: Search,
              title: "Find a match",
              text: "Choose a blood group and narrow your search by location.",
            },
            {
              icon: Phone,
              title: "Connect with a donor",
              text: "View their profile and reveal their number with their consent.",
            },
            {
              icon: HeartHandshake,
              title: "Coordinate with care",
              text: "Confirm availability and arrange donation with your blood bank.",
            },
          ].map((s, i) => (
            <article key={s.title}>
              <div className="step-icon">
                <s.icon size={25} />
              </div>
              <span className="step-number">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="join">
        <div>
          <span className="eyebrow">Your willingness matters</span>
          <h2>Someone nearby may need your help.</h2>
          <p>
            Create a donor profile. Choose when you’re available and stay in
            control of your listing.
          </p>
        </div>
        <Link className="button" href="/register">
          Become a donor
          <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
