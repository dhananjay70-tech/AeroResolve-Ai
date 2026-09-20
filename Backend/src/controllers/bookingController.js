const bookingService = require("../services/bookingService");
const { success } = require("../utils/response");

async function getByPnr(req, res, next) {
  try {
    const booking = await bookingService.getBookingByPnr(req.params.pnr);
    success(res, booking, 200);
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await bookingService.getBookingStatus(req.params.pnr);
    success(res, status, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = { getByPnr, getStatus };
