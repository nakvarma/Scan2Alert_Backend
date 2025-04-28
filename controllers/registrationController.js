const Registration = require('../models/Registration');

exports.getAllRegistrations = async (req, res) => {
  try {
    const data = await Registration.find({});
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const record = await Registration.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Registration not found' });
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteRegistrationById = async (req, res) => {
  try {
    const deleted = await Registration.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Registration not found' });
    res.status(200).json({ message: 'Deleted successfully', deleted });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getVehicleByNumber = async (req, res) => {
  try {
    const { number } = req.params;
    const registration = await Registration.findOne({ 'vehicles.number': number });

    if (!registration) return res.status(404).json({ error: 'Vehicle not found' });

    const vehicleDetails = registration.vehicles.find(v => v.number === number);
    res.status(200).json({
      ownerPhone: registration.phone,
      vehicle: vehicleDetails,
      registeredAt: vehicleDetails.createdAt,
      lastUpdated: vehicleDetails.updatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
