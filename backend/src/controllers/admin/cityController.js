const City = require('../../models/City');
const Community = require('../../models/Community');
const User = require('../../models/User');
const Campaign = require('../../models/Campaign');
const mongoose = require('mongoose');

// @desc    Get all cities with usage statistics
// @route   GET /api/v1/admin/cities
// @access  Private/Admin
exports.getCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 }).lean();
    
    // For each city, calculate how many communities use it, and how many users are in it
    const enrichedCities = await Promise.all(cities.map(async (city) => {
      // Count communities mapping this city
      const communitiesCount = await Community.countDocuments({ cityIds: city._id });
      
      // Count users mapping this city (either by matching name temporarily, or by future cityId)
      // Since users currently have a String 'city', we match by string name for now.
      const membersCount = await User.countDocuments({ 
        role: 'user',
        $or: [
          { city: new RegExp(`^${city.name}$`, 'i') }, // Match by exact string for backward compatibility
          { cityId: city._id } // Future proofing
        ]
      });

      return {
        ...city,
        communitiesCount,
        membersCount
      };
    }));

    res.status(200).json({
      status: 'success',
      count: enrichedCities.length,
      data: enrichedCities
    });
  } catch (error) {
    console.error('Get Cities Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch cities' });
  }
};

// @desc    Create a new city
// @route   POST /api/v1/admin/cities
// @access  Private/Admin
exports.createCity = async (req, res) => {
  try {
    const { name, code, state, country, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ status: 'fail', message: 'City name is required' });
    }

    // Check for duplicates (case insensitive name + state)
    const existingCity = await City.findOne({ 
      name: new RegExp(`^${name}$`, 'i'),
      state: new RegExp(`^${state || 'Madhya Pradesh'}$`, 'i')
    });

    if (existingCity) {
      return res.status(400).json({ status: 'fail', message: 'This city already exists for this state.' });
    }

    const city = await City.create({
      name,
      code,
      state: state || 'Madhya Pradesh',
      country: country || 'India',
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: city
    });
  } catch (error) {
    console.error('Create City Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create city' });
  }
};

// @desc    Update a city
// @route   PUT /api/v1/admin/cities/:id
// @access  Private/Admin
exports.updateCity = async (req, res) => {
  try {
    const { name, code, state, country, isActive } = req.body;

    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ status: 'fail', message: 'City not found' });
    }

    // Check duplicate if name/state changed
    if (name && (name !== city.name || state !== city.state)) {
       const existingCity = await City.findOne({ 
        name: new RegExp(`^${name}$`, 'i'),
        state: new RegExp(`^${state || city.state}$`, 'i'),
        _id: { $ne: city._id }
      });
      if (existingCity) {
        return res.status(400).json({ status: 'fail', message: 'Another city with this name already exists in this state.' });
      }
    }

    if (name) city.name = name;
    if (code !== undefined) city.code = code;
    if (state) city.state = state;
    if (country) city.country = country;
    if (isActive !== undefined) city.isActive = isActive;

    await city.save();

    res.status(200).json({
      status: 'success',
      data: city
    });
  } catch (error) {
    console.error('Update City Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update city' });
  }
};

// @desc    Toggle city status (enable/disable)
// @route   PATCH /api/v1/admin/cities/:id/status
// @access  Private/Admin
exports.toggleCityStatus = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ status: 'fail', message: 'City not found' });
    }

    city.isActive = !city.isActive;
    await city.save();

    res.status(200).json({
      status: 'success',
      data: city
    });
  } catch (error) {
    console.error('Toggle City Status Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to toggle city status' });
  }
};

// @desc    Get city statistics
// @route   GET /api/v1/admin/cities/:id/statistics
// @access  Private/Admin
exports.getCityStatistics = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ status: 'fail', message: 'City not found' });
    }

    // Total communities assigned this city
    const totalCommunities = await Community.countDocuments({ cityIds: city._id });

    // Since members currently use string city names, query by regex
    const cityRegex = new RegExp(`^${city.name}$`, 'i');

    const totalMembers = await User.countDocuments({ role: 'user', city: cityRegex });
    const activeMembers = await User.countDocuments({ role: 'user', city: cityRegex, verificationStatus: 'verified' });
    const professionals = await User.countDocuments({ city: cityRegex, profession: { $exists: true, $ne: '' } });
    const matrimonialProfiles = await User.countDocuments({ city: cityRegex, maritalStatus: { $exists: true, $ne: '' } });
    
    // For events (campaigns), if they have a location matching
    const events = await Campaign.countDocuments({ location: cityRegex });

    res.status(200).json({
      status: 'success',
      data: {
        city: city.name,
        totalCommunities,
        totalMembers,
        activeMembers,
        professionals,
        matrimonialProfiles,
        events
      }
    });
  } catch (error) {
    console.error('City Statistics Error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch city statistics' });
  }
};
