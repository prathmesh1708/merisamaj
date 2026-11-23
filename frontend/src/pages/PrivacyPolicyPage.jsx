import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

// Public page (no login needed) — app stores need a public link to it.
// Fill in the [bracketed] values before going live; the master copy of the
// text is the "ApniSamaj Privacy Policy" doc.
export const POLICY_UPDATED = '23 November 2026';
const COMPANY = '[Company legal name], [registered address], India';
const CONTACT = {
  officer: '[Grievance Officer name]',
  email: '[grievance@yourdomain.com]',
  phone: '[+91 XXXXX XXXXX]',
  address: '[Company legal name, registered address]',
  privacyEmail: '[privacy@yourdomain.com]'
};

const Section = ({ n, title, children }) => (
  <section className="space-y-2.5">
    <h2 className="text-[15px] font-black text-slate-900">{n}. {title}</h2>
    {children}
  </section>
);
const P = ({ children }) => <p className="text-[13px] leading-relaxed text-slate-600">{children}</p>;
const List = ({ items }) => (
  <ul className="space-y-1.5 pl-1">
    {items.map(([label, text]) => (
      <li key={label} className="text-[13px] leading-relaxed text-slate-600 flex gap-2">
        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
        <span><strong className="text-slate-800">{label}</strong> {text}</span>
      </li>
    ))}
  </ul>
);
// Two-column facts; stacks on phones instead of a cramped table.
const Rows = ({ head, rows }) => (
  <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
    {head && (
      <div className="hidden sm:grid grid-cols-[180px_1fr] gap-3 px-3.5 py-2 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
        <span>{head[0]}</span><span>{head[1]}</span>
      </div>
    )}
    {rows.map(([a, b]) => (
      <div key={a} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0.5 sm:gap-3 px-3.5 py-2.5">
        <span className="text-[12.5px] font-bold text-slate-800">{a}</span>
        <span className="text-[12.5px] leading-relaxed text-slate-600">{b}</span>
      </div>
    ))}
  </div>
);

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} aria-label="Back" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-black text-slate-900">Privacy Policy</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-[max(env(safe-area-inset-bottom),2rem)] space-y-6">
        <div className="rounded-2xl bg-purple-50 border border-purple-100 p-4 flex gap-3">
          <ShieldCheck size={22} className="text-purple-600 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-purple-900">We never sell your data or show third-party ads.</p>
            <p className="text-[11.5px] font-semibold text-purple-700/80 mt-0.5">Last updated: {POLICY_UPDATED}</p>
          </div>
        </div>

        <Section n={1} title="Introduction">
          <P>This policy explains what personal data ApniSamaj collects, why, who can see it, and how you can control it. ApniSamaj is operated by {COMPANY} ("we", "us").</P>
          <P>It covers the ApniSamaj member app and website, including community features, the family tree, matrimonial services, donations, Dharmashala bookings, chat and groups. It also covers the panels used by community Heads, Sub-Heads and administrators.</P>
          <P>We process personal data under India's Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and its rules. By creating an account or using ApniSamaj, you consent to the processing described here. You can withdraw that consent at any time (see section 9).</P>
        </Section>

        <Section n={2} title="Information we collect">
          <P>We collect only what you give us, what our services generate as you use them, and what our payment and verification partners return to us.</P>
          <Rows head={['Category', 'Examples']} rows={[
            ['Account', 'Mobile number, email, password, login ID, one-time passwords (OTP)'],
            ['Basic profile', 'Name, photo, cover photo, gender, date of birth, blood group, marital status, gotra, family type, bio'],
            ['Community', 'Community, sub-community, city, district, state, pincode, membership status'],
            ['Education and work', 'Qualification, school, profession, company, annual income, work city (optional)'],
            ['Address and contacts', 'House and street address, landmark, alternate phone and email, social media links (optional)'],
            ['Family tree', 'Names, relations, ages or dates of birth, gender, phone numbers and photos of family members you add'],
            ['Matrimonial profile', 'Personal details, photos, education, family, lifestyle (including diet), location, partner preferences, horoscope, about you, previous marriages — only if you create one'],
            ['Identity verification', 'Aadhaar-verified name and result; optionally the details and photo returned by UIDAI — only if you choose to verify (section 5)'],
            ['Payments and donations', 'Plan purchased, amount, payment status, Razorpay order and payment IDs, donation records, referral points'],
            ['Content and messages', 'Posts, stories, comments, likes, chat messages, voice notes, photos, group activity, obituaries, event responses, votes, bookings'],
            ['Activity', 'Matrimonial profile views and visitors, interests sent and received, shortlists, blocks and reports'],
            ['Device', 'Push notification token, browser or device type, IP address, log data']
          ]} />
          <P>The app asks for camera and microphone access only when you take a photo or record a voice note in chat. It reads your device location only when you choose to share your location in a chat, and sends it only to that conversation. We do not read your phone's contacts. Your profile city comes from what you type.</P>
        </Section>

        <Section n={3} title="How we use information">
          <P>We use your data to run ApniSamaj and its community features, never to sell it or to show third-party advertising.</P>
          <List items={[
            ['Run your account:', 'sign-up, OTP login, keeping you signed in, and recovering access.'],
            ['Connect your community:', 'show your profile in the member directory, build family trees, list professionals, and run events, groups, votes, census updates and obituaries.'],
            ['Matrimonial matching:', 'suggest profiles that fit your partner preferences and the visibility rules you set (section 4).'],
            ['Verification:', 'confirm identity with Aadhaar if you choose, and let community Heads approve membership.'],
            ['Payments:', 'process subscriptions, donations and Dharmashala bookings, issue receipts, and credit referral points.'],
            ['Notifications:', 'send OTPs by SMS and alerts by push notification or email, as set in your notification preferences.'],
            ['Safety:', 'handle reports and blocks, prevent fraud and spam, enforce our terms, and keep audit logs of administrator actions.'],
            ['Improve the service:', 'fix errors and understand which features are used.'],
            ['Legal duties:', 'meet tax, accounting and law-enforcement obligations.']
          ]} />
        </Section>

        <Section n={4} title="Matrimonial profiles">
          <P>Your matrimonial profile is seen only by the members you allow, and your phone and email stay hidden until you choose to share them.</P>
          <List items={[
            ['Who can see you:', 'you choose whether your profile is shown to your own sub-community, other sub-communities, your community and other communities (all or selected ones).'],
            ['Extra filters:', 'you can also limit viewers to Aadhaar-verified members, community-verified members, or members in selected locations.'],
            ['Photos:', 'you choose whether photos are public or private. Members without a plan that includes clear photos see a blurred version. Screenshot protection is on by default where the device supports it.'],
            ['Contact details:', 'your phone number and email are hidden by default. They are shown only after you accept an interest, or if you turn on contact sharing.'],
            ['Incognito mode:', "browse without appearing in other members' visitor lists."],
            ['Activity we record:', 'profile views, visitor lists, interests sent and accepted, shortlists, blocks and reports. These run the feature and help keep members safe.'],
            ['After marriage:', 'when you mark your profile as married or close it, it is removed from search. Shared success stories appear only with your permission.']
          ]} />
          <P>Community Heads and administrators can see matrimonial profiles to verify them and to handle reports.</P>
        </Section>

        <Section n={5} title="Aadhaar and identity verification">
          <P>Aadhaar verification is optional, and we never store your full Aadhaar number.</P>
          <List items={[
            ['How it works:', 'you enter your Aadhaar number. UIDAI sends an OTP to your Aadhaar-linked mobile through our verification partner, QuickeKYC. Your "Aadhaar verified" badge is given only after a successful UIDAI OTP check.'],
            ['What we keep:', 'your verified name, the date of verification, the last 4 digits of your Aadhaar number, and a one-way hash of the number. We use the hash only to stop one Aadhaar from verifying more than one account.'],
            ['Sensitive details:', 'your date of birth, gender, address and UIDAI photo, if returned, are encrypted with AES-256-GCM. They are stored separately from your profile.'],
            ['Who can see them:', 'only authorised ApniSamaj administrators. Each time an administrator opens these details, we log who, when, and from which IP address. Community Heads and other members see only your verified badge and verified name.'],
            ['Purpose limit:', 'we use Aadhaar data only to verify your identity, never for any other purpose.']
          ]} />
        </Section>

        <Section n={6} title="Who we share it with">
          <P>We do not sell your personal data. We share it only with the people and providers below, and only as much as each needs.</P>
          <P><strong className="text-slate-800">Other members.</strong> Your name, photo, community and city appear in the member directory and on your posts. You control your phone number, email and family details: each can be public, followers only, or private. You can also make your whole profile private.</P>
          <P><strong className="text-slate-800">Your community Head and their team.</strong> The Head, Sub-Heads and Local Heads of your community see member details to approve memberships, verify profiles, manage events, donations and census data, and handle reports. Each sees only what their role permits, and the panel logs their actions.</P>
          <P><strong className="text-slate-800">Service providers</strong> who process data for us under contract:</P>
          <Rows head={['Provider', 'What they do · data they receive']} rows={[
            ['Razorpay', 'Payment processing · amount, order details, contact details; card or UPI details go straight to Razorpay, never to us'],
            ['QuickeKYC', 'Aadhaar OTP verification with UIDAI · Aadhaar number, OTP'],
            ['Cloudinary', 'Image storage and delivery · photos you upload'],
            ['Google Firebase Cloud Messaging', 'Push notifications · device token, notification text'],
            ['[SMS gateway provider]', 'OTP and alert SMS · mobile number, message text'],
            ['[Hosting and database provider]', 'Servers and database · all data, stored on our behalf']
          ]} />
          <P><strong className="text-slate-800">Legal reasons.</strong> We disclose data when the law, a court or a government authority requires it. We also disclose it to protect members' safety or to prevent fraud.</P>
          <P><strong className="text-slate-800">Business transfer.</strong> If ApniSamaj is merged or sold, your data moves to the new operator under this policy. We will notify you first.</P>
        </Section>

        <Section n={7} title="Payments, donations and referrals">
          <P>Razorpay handles every payment. We never see or store your card number, UPI PIN or bank login.</P>
          <List items={[
            ['Subscriptions:', 'we keep the plan, price, dates, payment status and Razorpay IDs. We use them to unlock plan features and to keep billing and tax records.'],
            ['Donations:', "we keep the amount, cause, date and receipt. Where a campaign allows it, you can donate anonymously. Your name is then hidden from public donor lists, but your community's administrators still see it in their accounts."],
            ['Dharmashala bookings:', "we keep booking dates, guest details and payments, and share them with the Dharmashala's managers."],
            ['Referrals:', 'when someone joins with your referral code, we record that you referred them. You earn points when they make qualifying purchases.']
          ]} />
        </Section>

        <Section n={8} title="Storage, security and retention">
          <P>Your data is stored on servers in [India / region], and we keep it only while your account is active or the law requires it.</P>
          <P><strong className="text-slate-800">How we protect it.</strong> All traffic is encrypted with HTTPS. Member passwords are stored as bcrypt hashes. Sensitive Aadhaar details are encrypted with AES-256-GCM, and only authorised administrators can open them. We also use rate limits, input sanitisation, role-based access for Heads and administrators, and audit logs. No system is perfectly secure. If a breach affects your data, we will notify you and the Data Protection Board of India as the law requires.</P>
          <Rows head={['Data', 'Kept for']} rows={[
            ['Account and profile', 'Until you delete your account'],
            ['Matrimonial profile', 'Until you delete it or your account'],
            ['Chat messages, posts and stories', 'Until you or the other party delete them, or your account is deleted'],
            ['Payment, donation and receipt records', '8 years, as Indian tax and accounting law requires'],
            ['Aadhaar verification record', 'Until you delete your account, unless the law requires longer'],
            ['OTP codes', 'A few minutes, until they expire'],
            ['Security and audit logs', '[180 days / 1 year]']
          ]} />
          <P>After deletion, copies can stay in backups for up to [90 days] before they are overwritten.</P>
        </Section>

        <Section n={9} title="Your rights and choices">
          <P>You can see, correct, download or delete your data, and withdraw consent, at any time.</P>
          <List items={[
            ['Access and correction:', 'view and edit most of your data in Edit Profile, Family and Matrimonial settings. For anything you cannot edit, contact us (section 10).'],
            ['Privacy controls:', 'set your phone, email and family details to public, followers only or private, and make your profile private. Set matrimonial visibility, photo privacy and incognito mode in matrimonial settings.'],
            ['Notifications:', 'turn email, SMS, push and announcement notifications on or off in Settings. OTP and security messages are always sent.'],
            ['Delete your matrimonial profile:', 'remove it at any time without deleting your ApniSamaj account.'],
            ['Delete your account:', `email ${CONTACT.privacyEmail} from your registered email, or write to the Grievance Officer. We delete or anonymise your data within 30 days, except records we must keep by law (section 8).`],
            ['Withdraw consent:', 'withdrawing consent stops future processing. Features that need that data, such as matrimonial matching or Aadhaar verification, will stop working for you.'],
            ['Nominate someone:', 'you can name a person to exercise these rights for you in the event of your death or incapacity.']
          ]} />
          <P>We reply to requests within 30 days and may ask you to confirm your identity first.</P>
        </Section>

        <Section n={10} title="Children, changes and contact">
          <P><strong className="text-slate-800">Children.</strong> You must be 18 or older to create an ApniSamaj account, and 18 (women) or 21 (men) to create a matrimonial profile, as Indian marriage law requires. You may add family members under 18 to your family tree as their parent or guardian. Their details are shown only to members who can see your family. We do not knowingly let anyone under 18 hold an account. If we learn that a minor has signed up, we delete the account.</P>
          <P><strong className="text-slate-800">Changes to this policy.</strong> We will post any update here and change the date at the top. For significant changes, we will also notify you in the app or by SMS before they take effect.</P>
          <P><strong className="text-slate-800">Grievance Officer.</strong> For questions, requests or complaints about your data:</P>
          <Rows rows={[
            ['Name', CONTACT.officer],
            ['Email', CONTACT.email],
            ['Phone', CONTACT.phone],
            ['Address', CONTACT.address]
          ]} />
          <P>We acknowledge complaints within 24 hours and resolve them within 15 days. If you are not satisfied, you can complain to the Data Protection Board of India.</P>
        </Section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
