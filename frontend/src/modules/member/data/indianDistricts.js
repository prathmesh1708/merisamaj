/**
 * Districts of each state offered in the registration form (State → District).
 * Old district names that people still search for are kept in brackets.
 * Each list ends with 'Other' for places not in the list.
 */
export const DISTRICTS_BY_STATE = {
  'Madhya Pradesh': [
    'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind',
    'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori',
    'Guna', 'Gwalior', 'Harda', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone',
    'Maihar', 'Mandla', 'Mandsaur', 'Mauganj', 'Morena', 'Narmadapuram (Hoshangabad)', 'Narsinghpur',
    'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna',
    'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh',
    'Ujjain', 'Umaria', 'Vidisha'
  ],
  Rajasthan: [
    'Ajmer', 'Alwar', 'Balotra', 'Banswara', 'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara',
    'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Deeg', 'Dholpur', 'Didwana-Kuchaman',
    'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur',
    'Karauli', 'Khairthal-Tijara', 'Kota', 'Kotputli-Behror', 'Nagaur', 'Pali', 'Phalodi', 'Pratapgarh',
    'Rajsamand', 'Salumbar', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'
  ],
  Maharashtra: [
    'Ahilyanagar (Ahmednagar)', 'Akola', 'Amravati', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur',
    'Chhatrapati Sambhajinagar (Aurangabad)', 'Dharashiv (Osmanabad)', 'Dhule', 'Gadchiroli', 'Gondia',
    'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
    'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
    'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ],
  Gujarat: [
    'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad',
    'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhumi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
    'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal',
    'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara',
    'Valsad', 'Vav-Tharad'
  ],
  Delhi: [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi',
    'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
  ],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat',
    'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor',
    'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad',
    'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar (Noida)', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur',
    'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat',
    'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow',
    'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad',
    'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj (Allahabad)', 'Raebareli', 'Rampur',
    'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar',
    'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
  ],
  Bihar: [
    'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga',
    'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria',
    'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
    'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi',
    'Siwan', 'Supaul', 'Vaishali', 'West Champaran'
  ],
  Karnataka: [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar',
    'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad',
    'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru',
    'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara',
    'Vijayapura', 'Yadgir'
  ],
  Punjab: [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur',
    'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Pathankot',
    'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur', 'Shaheed Bhagat Singh Nagar',
    'Sri Muktsar Sahib', 'Tarn Taran'
  ],
  Haryana: [
    'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind',
    'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari',
    'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'
  ],
  'West Bengal': [
    'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly',
    'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia',
    'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
    'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'
  ],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode',
    'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
    'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli',
    'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
    'Viluppuram', 'Virudhunagar'
  ],
  Telangana: [
    'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Jangaon',
    'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
    'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri',
    'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
    'Rajanna Sircilla', 'Ranga Reddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy',
    'Warangal', 'Yadadri Bhuvanagiri'
  ],
  'Andhra Pradesh': [
    'Alluri Sitharama Raju', 'Anakapalli', 'Anantapur', 'Annamayya', 'Bapatla', 'Chittoor',
    'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur', 'Kakinada', 'Krishna', 'Kurnool',
    'Nandyal', 'NTR', 'Palnadu', 'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore',
    'Sri Sathya Sai', 'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari',
    'YSR Kadapa'
  ],
  Kerala: [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode',
    'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
  ],
  Chhattisgarh: [
    'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada',
    'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
    'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund',
    'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh',
    'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'
  ],
  Jharkhand: [
    'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda',
    'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
    'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
  ],
  Uttarakhand: [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal',
    'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla',
    'Sirmaur', 'Solan', 'Una'
  ]
};

/** Districts for a state, ending with 'Other'. Unknown / 'Other' state → just 'Other'. */
export const getDistrictsForState = (state) => [...(DISTRICTS_BY_STATE[state] || []), 'Other'];
