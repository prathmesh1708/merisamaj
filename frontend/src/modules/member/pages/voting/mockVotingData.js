// English Mock Data matching the reference image layout

export const votingInstructions = [
  {
    id: 1,
    step: "1",
    title: "Choose Election",
    desc: "Select an election from the list of ongoing elections",
  },
  {
    id: 2,
    step: "2",
    title: "View Candidates",
    desc: "View information and profiles of all candidates",
  },
  {
    id: 3,
    step: "3",
    title: "Cast Vote",
    desc: "Choose your preferred candidate and cast your vote",
  },
  {
    id: 4,
    step: "4",
    title: "Confirm Choice",
    desc: "A confirmation message will appear before submitting the vote",
  },
  {
    id: 5,
    step: "5",
    title: "Vote Success",
    desc: "Confirmation message of successful vote submission.",
  },
];

export const votingGuidelines = [
  {
    id: "g1",
    title: "A member can only vote once.",
    desc: "To prevent election fraud, only one vote per ID will be recorded.",
    isCrucial: true,
  },
  {
    id: "g2",
    title: "Voting is completely secure and confidential.",
    desc: "Your preference is completely safe; it will not be visible to anyone (including administrators).",
    isCrucial: false,
  },
  {
    id: "g3",
    title: "You can only vote within the election time limit.",
    desc: "The voting link will automatically close after the deadline ends.",
    isCrucial: false,
  },
  {
    id: "g4",
    title: "Votes cannot be changed after submission.",
    desc: "Please select the candidate carefully before confirming.",
    isCrucial: true,
  },
];

export const securityFeatures = [
  {
    id: "s1",
    title: "Aadhar/Mobile Verification",
    desc: "Aadhar and OTP-based verification to ensure voter authenticity."
  },
  {
    id: "s2",
    title: "One Device = One Vote",
    desc: "Preventing multiple voting attempts from the same device."
  },
  {
    id: "s3",
    title: "IP & Device Tracking",
    desc: "Security system to monitor suspicious activities and spam voting."
  },
  {
    id: "s4",
    title: "Fake Voting Protection",
    desc: "Complete ban on unauthorized or bot voting through secure data encryption."
  }
];

export const mockElections = [
  {
    id: "el1",
    title: "Samaj President Post Election 2024",
    description: "Vote for your qualified candidate for the development and a better future of the community.",
    type: "Community Election",
    status: "Active",
    startDate: "20 May 2024",
    endDate: "30 May 2024",
    closesIn: "Active",
    totalVotesCast: 4540,
    candidates: [
      {
        id: "c1",
        name: "Rajesh Sharma",
        initials: "RS",
        age: 45,
        profession: "Businessman",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Committed to business experience and transparent digital community management.",
        bio: "Rajesh Sharma (Age: 45 years) is a successful businessman. He has been active in social welfare activities for the last 12 years. His goal is to make the community's income and expenditure details completely digital and transparent.",
        manifesto: [
          "Complete computerization and digital audit of community financial records.",
          "Financial assistance and mentorship wing for young entrepreneurs starting new businesses.",
          "Discount on booking charges for community guest houses and community centers."
        ],
        experience: "12 years active community member, President - Indore Trade Association",
        education: "Graduate (Commerce) - Devi Ahilya University",
        initialVotes: 1253,
      },
      {
        id: "c2",
        name: "Suresh Yadav",
        initials: "SY",
        age: 42,
        profession: "Social Worker",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Education, health support, and upliftment of weaker sections of the community.",
        bio: "Suresh Yadav (Age: 42 years) is a full-time social worker. He is known for providing free education to children of poor community families and organizing medical camps.",
        manifesto: [
          "Creation of higher education scholarship fund for meritorious and needy students.",
          "Free medical aid and treatment support to poor families through health insurance schemes.",
          "Home-industry training programs to make community women self-reliant."
        ],
        experience: "10 years Free Education Mission Director, Red Cross Member",
        education: "M.A. (Sociology) - Vikram University",
        initialVotes: 2145,
      },
      {
        id: "c3",
        name: "Manish Gupta",
        initials: "MG",
        age: 38,
        profession: "Entrepreneur",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Young thinking, new technology, and modern integration of the community.",
        bio: "Manish Gupta (Age: 38 years) is a young entrepreneur. His vision is to connect the community with modern technology to increase self-employment opportunities for youth.",
        manifesto: [
          "Seed-funding and mentorship circle for community youth startups.",
          "Expansion of 'ApniSamaj' app for community activities and business networking.",
          "Organization of annual sports and cultural exchange programs."
        ],
        experience: "Co-founder - Indore Youth Club, Member - JCI",
        education: "B.E. (Computer Science), MBA",
        initialVotes: 876,
      },
      {
        id: "c4",
        name: "Ajay Singh",
        initials: "AS",
        age: 50,
        profession: "Educationist",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Policy reforms in the community with experience and impartiality.",
        bio: "Ajay Singh (Age: 50 years) is a senior professor and educationist. He wants to bring impartiality and an intellectual approach to the community's administrative and decision-making processes.",
        manifesto: [
          "Coaching for national-level competitive exams for community students.",
          "Construction of community libraries and e-learning centers.",
          "Solar and water harvesting systems in community buildings for environmental protection and water conservation."
        ],
        experience: "25 years teaching experience, former advisor - State Education Committee",
        education: "Ph.D. (Pedagogy) - Banaras Hindu University",
        initialVotes: 266,
      },
    ],
  },
  {
    id: "el4",
    title: "Samaj Vice President Post Election 2024",
    description: "Choose your qualified candidate for the Vice President post of the community.",
    type: "Community Election",
    status: "Active",
    startDate: "22 May 2024",
    endDate: "05 June 2024",
    closesIn: "Active",
    totalVotesCast: 1840,
    candidates: [
      {
        id: "c5",
        name: "Amit Patel",
        initials: "AP",
        age: 44,
        profession: "Merchant",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Committed to welfare schemes and economic strengthening of the community.",
        bio: "Amit Patel (Age: 44 years) is a prominent textile merchant and actively participates in social programs. His vision is to strengthen the community's financial fund.",
        manifesto: [
          "Financial assistance to young community entrepreneurs starting small businesses.",
          "Organization of annual trade fairs and networking events."
        ],
        experience: "8 years executive committee member, Vice President - Textile Association",
        education: "B.Com (Devi Ahilya University)",
        initialVotes: 980,
      },
      {
        id: "c6",
        name: "Vijay Verma",
        initials: "VV",
        age: 46,
        profession: "Lawyer",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        shortIntro: "Simplifying community rules and providing legal aid.",
        bio: "Vijay Verma (Age: 46 years) has been practicing law for the last 20 years. He is committed to providing free legal advice and assistance to community members.",
        manifesto: [
          "Systematic resolution of legal matters of community buildings.",
          "Establishment of free legal consultation wing for poor families."
        ],
        experience: "20 years advocate experience, legal advisor - Community Reform Committee",
        education: "LL.B., LL.M. (Law College Indore)",
        initialVotes: 860,
      }
    ]
  },
  {
    id: "el2",
    title: "Samaj Secretary Post Election 2023",
    description: "The election process was completed for the discharge of responsibilities of the community secretary post.",
    type: "Secretary Election",
    status: "Completed",
    startDate: "10 May 2023",
    endDate: "30 May 2023",
    closesIn: "Ended",
    totalVotesCast: 3200,
    candidates: [
      {
        id: "c11",
        name: "Ramesh Patidar",
        initials: "RP",
        age: 46,
        profession: "Farmer / Businessman",
        avatar: null,
        shortIntro: "Establishing coordination between agricultural and business sectors.",
        manifesto: ["Enhance community coordination"],
        initialVotes: 1800,
      },
      {
        id: "c12",
        name: "Dinesh Verma",
        initials: "DV",
        age: 43,
        profession: "Lawyer",
        avatar: null,
        shortIntro: "Legal awareness and community welfare policies.",
        manifesto: ["Free Legal Consultation Center"],
        initialVotes: 1400,
      }
    ],
  },
  {
    id: "el3",
    title: "Samaj Treasurer Post Election 2022",
    description: "The election was organized for managing community financial assets and funds.",
    type: "Treasurer Election",
    status: "Completed",
    startDate: "05 May 2022",
    endDate: "15 May 2022",
    closesIn: "Ended",
    totalVotesCast: 2850,
    candidates: [
      {
        id: "c21",
        name: "Pramod Maheshwari",
        initials: "PM",
        age: 51,
        profession: "Chartered Accountant",
        avatar: null,
        shortIntro: "Transparent audit report and systematic community fund management.",
        manifesto: ["Quarterly Audit Report Publication"],
        initialVotes: 1950,
      },
      {
        id: "c22",
        name: "Amit Shah",
        initials: "AS",
        age: 49,
        profession: "Finance Consultant",
        avatar: null,
        shortIntro: "Managing maximum profit generation on community properties.",
        manifesto: ["Interest-free loan schemes"],
        initialVotes: 900,
      }
    ],
  },
];
