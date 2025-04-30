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



exports.deleteVehicleById = async (req, res) => {
  const { userId, vehicleNumber } = req.params;
  console.log(userId,vehicleNumber)
  try {
    await Registration.findByIdAndUpdate(userId, {
      $pull: { vehicles: { _id: vehicleNumber } }
    });

    const user = await Registration.findById(userId);

    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    if (user.vehicles.length === 0) {
      await Registration.findByIdAndDelete(userId);
      return res.status(200).send({ message: 'Last vehicle deleted, user also removed' });
    }

    res.status(200).send({ message: 'Vehicle removed' });

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Failed to delete vehicle or user' });
  }
};




