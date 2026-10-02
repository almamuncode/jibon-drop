export default function Privacy() {
  return (
    <article className="container narrow prose">
      <h1>Privacy & respectful contact</h1>
      <p>
        JibonDrop connects people with donors who consent to a public listing
        and contact-number sharing. Search is free and does not require an
        account.
      </p>
      <h2>What is public?</h2>
      <p>
        Your name, blood group, administrative location, optional photo,
        willingness to donate, recorded donation count and last donation date.
        Your number is returned only through the contact action. Anyone may use
        that action, subject to rate limits.
      </p>
      <h2>You stay in control</h2>
      <p>
        Hide your listing or withdraw contact consent from your profile at any
        time. Hidden profiles are unavailable through their public link. You can
        delete your account, records and picture from your dashboard.
      </p>
      <h2>Private information</h2>
      <p>
        Hospital names, notes and free-text area fallback remain private. Do not
        enter patient identity or medical records. Email, account credentials
        and session records are never public.
      </p>
      <h2>Contact with care</h2>
      <p>
        Explain the blood group, hospital and timing. Respect a donor’s decision
        and avoid repeated unsolicited calls. Confirm medical eligibility with
        the blood bank.
      </p>
      <h2>Service data</h2>
      <p>
        Sign-in uses Google or email/username and a securely hashed password.
        Contact numbers are self-reported and are not verified. Photos use
        Vercel Blob storage. Short-lived hashed rate-limit records protect
        contact and login actions. Sessions expire after 30 days. Account
        deletion removes profile and donation data; failed photo removal is
        queued for retry.
      </p>
    </article>
  );
}
