const customerService = require("../services/customerService");
const { success } = require("../utils/response");

async function getByPnr(req, res, next) {
  try {
    const customer = await customerService.getCustomerByPnr(req.params.pnr);
    success(res, customer, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = { getByPnr };
