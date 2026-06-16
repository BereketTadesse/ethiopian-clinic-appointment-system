export const createAppointment = async (req, res) => {
  res.status(201).json({ message: 'Create appointment endpoint placeholder' });
};

export const getAppointments = async (req, res) => {
  res.status(200).json({ appointments: [] });
};
