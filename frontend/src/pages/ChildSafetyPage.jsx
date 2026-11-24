import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Section, P, List, Rows } from './PrivacyPolicyPage';

// Public page (no login needed): Google Play's Child Safety Standards need a public link.
// Fill in the [bracketed] values before going live; the master copy of the text is
// the "ApniSamaj — Child Safety Standards Policy" doc.
const UPDATED = '24 November 2026';
const COMPANY = '[Company legal name], [registered address], India';
const OFFICER = {
  name: '[Child Safety Officer name]',
  email: '[childsafety@yourdomain.com]',
  phone: '[+91 XXXXX XXXXX]',
  address: '[Company legal name, registered address]'
};
const B = ({ children }) => <strong className="text-slate-800">{children}</strong>;

const ChildSafetyPage = () => {
  const navigate = useNavigate();
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-[100dvh] bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} aria-label="Back" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-black text-slate-900">Child Safety Standards</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-[max(env(safe-area-inset-bottom),2rem)] space-y-6">
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex gap-3">
          <ShieldAlert size={22} className="text-rose-600 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-rose-900">If a child is in danger right now, call 112 (police) or 1098 (Childline).</p>
            <p className="text-[11.5px] font-semibold text-rose-700/80 mt-0.5">Last updated: {UPDATED}</p>
          </div>
        </div>

        <Section n={1} title="Our commitment">
          <P>ApniSamaj has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM). Any such content is removed, the account is banned, and we report it to the authorities.</P>
          <P>ApniSamaj is a community platform for adults. It includes a member directory, family trees, matrimonial profiles, posts, stories, chat and groups. This policy applies to everyone who uses it: members, community Heads, Sub-Heads, Local Heads and administrators. It applies to every feature and every type of content, including profiles, photos, messages, posts, stories, comments, groups and obituaries.</P>
          <P>ApniSamaj is operated by {COMPANY}. This policy forms part of our Terms of Use and <a href="/privacy-policy" className="text-purple-600 font-bold hover:underline">Privacy Policy</a>.</P>
        </Section>

        <Section n={2} title="Age requirements">
          <P>You must be 18 or older to hold an ApniSamaj account. Matrimonial profiles have a higher minimum set by Indian law.</P>
          <Rows head={['Who', 'Minimum age']} rows={[
            ['Any ApniSamaj account', '18'],
            ['Matrimonial profile (woman)', '18, under the Prohibition of Child Marriage Act, 2006'],
            ['Matrimonial profile (man)', '21, under the Prohibition of Child Marriage Act, 2006']
          ]} />
          <P><B>Children in family trees.</B> A parent or guardian may list children under 18 in their family tree. A child listed this way is a record, not an account. They cannot log in, chat, post, or be searched in matrimonial. Their details are visible only to members who can see the parent's family.</P>
          <P>If we learn that an account belongs to someone under 18, or that a matrimonial profile belongs to someone under the legal marriage age, we remove it.</P>
        </Section>

        <Section n={3} title="Prohibited content and behaviour">
          <P>The following are banned everywhere on ApniSamaj, in public and in private messages. One violation is enough for a permanent ban.</P>
          <List items={[
            ['Child sexual abuse material:', 'any image, video, drawing, text or AI-generated content that sexualises a person under 18.'],
            ['Grooming:', 'building contact or trust with a child for sexual purposes, or asking a child for images, meetings or personal details.'],
            ['Sextortion:', 'threatening a child, or anyone, with sexual images.'],
            ['Sexualised comments', 'about children, including on family photos and family-tree entries.'],
            ['Child marriage:', 'arranging, promoting or seeking a marriage with anyone under the legal age, through matrimonial or any other feature.'],
            ['Trafficking or exploitation:', 'advertising, buying or selling children, or recruiting them for labour or sexual purposes.'],
            ["Sharing a child's personal details", '(school, address, routine or photos) to target or endanger them.'],
            ['Linking to', 'any of the above on other sites.']
          ]} />
        </Section>

        <Section n={4} title="How we prevent harm">
          <P>Safeguards in the app limit who can reach members, and especially children's information.</P>
          <List items={[
            ['Verified sign-up:', 'every account needs a mobile number confirmed by OTP. Community Heads then approve membership before full access is given.'],
            ['Age checks:', 'members must give a date of birth showing they are 18 or older. Matrimonial profiles below the legal marriage age are refused.'],
            ['Optional Aadhaar verification:', "UIDAI OTP verification confirms a member's real name. Members can limit their matrimonial profile to verified viewers."],
            ['Matrimonial controls:', 'phone numbers and email stay hidden until an interest is accepted. Members choose who can see their profile and photos.'],
            ['Family privacy:', 'family-tree details, including children listed there, can be set to public, followers only, or private.'],
            ['Blocking and reporting:', 'any member can block another member, and report any post, story, chat or profile.'],
            ['Moderation:', 'community Heads and administrators can hide or remove posts and comments, and suspend accounts. Administrator actions are logged.']
          ]} />
        </Section>

        <Section n={5} title="How to report">
          <P>If a child is in immediate danger, call <B>112</B> (police) or <B>1098</B> (Childline) first, then tell us.</P>
          <List items={[
            ['Post:', 'tap ⋯ on the post, then Report Post.'],
            ['Story:', 'tap the flag at the top of the story.'],
            ['Chat:', 'tap ⋮ in the chat, then Report.'],
            ['Matrimonial profile:', 'open the profile, tap Report, and choose a reason.'],
            ['Group:', 'open the group and use Report group.'],
            ['Anything else:', `email our Child Safety Officer at ${OFFICER.email}.`]
          ]} />
          <P>Choose <B>Child safety concern</B> or <B>Person is under 18</B> as the reason. Such reports hide the content straight away while we review it. Do not download or forward abusive images; your report is enough.</P>
          <P>You can also report child sexual abuse material directly to the Government of India at <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-purple-600 font-bold hover:underline">cybercrime.gov.in</a> or by calling <B>1930</B>. Reports can be anonymous.</P>
        </Section>

        <Section n={6} title="How we respond">
          <P>Child safety reports go to the front of the queue and are acted on within 24 hours.</P>
          <Rows head={['Step', 'What we do']} rows={[
            ['1. Acknowledge', 'Confirm we received the report — within 24 hours'],
            ['2. Restrict', 'Hide the content and, where needed, suspend the account while we review — as soon as the report arrives'],
            ['3. Review', "A trained administrator checks the content and the account's history — within 24 hours"],
            ['4. Act', 'Remove the content and permanently ban the account and linked accounts'],
            ['5. Report', 'Report CSAM and child exploitation to the police and the National Cyber Crime Reporting Portal — within 24 hours'],
            ['6. Preserve', 'Keep the evidence securely for investigators, as the law requires — 180 days, or longer if asked']
          ]} />
          <P>We do not tell the reported person who made the report. Banned users may not create a new account.</P>
        </Section>

        <Section n={7} title="Law enforcement and legal compliance">
          <P>We comply with Indian child protection law and cooperate fully with investigators.</P>
          <List items={[
            ['POCSO Act, 2012:', 'section 19 requires anyone who learns of a sexual offence against a child to report it. We report to the local police or the Special Juvenile Police Unit.'],
            ['Information Technology Act, 2000:', 'section 67B makes child sexual abuse material a crime. Under the IT Rules, 2021, we remove such content and keep records for investigators.'],
            ['Prohibition of Child Marriage Act, 2006:', 'we remove matrimonial profiles below the legal marriage age and report attempts to arrange child marriages.'],
            ['National Cyber Crime Reporting Portal:', 'child sexual abuse material is reported at cybercrime.gov.in.'],
            ['Google Play Child Safety Standards:', 'this page is our published standard for Google Play.']
          ]} />
          <P>We answer lawful requests from police and courts promptly. In an emergency involving a child, we share information without waiting for a formal order where the law allows.</P>
        </Section>

        <Section n={8} title="Contact and updates">
          <P>Our Child Safety Officer handles every report and question about this policy.</P>
          <Rows rows={[
            ['Name', OFFICER.name],
            ['Email', OFFICER.email],
            ['Phone', OFFICER.phone],
            ['Address', OFFICER.address]
          ]} />
          <P>We review this policy at least once a year and after any serious incident. Changes are posted on this page with a new date at the top.</P>
        </Section>
      </main>
    </div>
  );
};

export default ChildSafetyPage;
