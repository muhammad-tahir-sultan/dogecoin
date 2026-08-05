"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/deposit/address', auth_1.protect, transactionController_1.getDepositAddress);
router.post('/deposit', auth_1.protect, transactionController_1.submitDeposit);
router.post('/withdraw', auth_1.protect, transactionController_1.requestWithdrawal);
router.post('/commission/claim', auth_1.protect, transactionController_1.claimCommission);
router.get('/history', auth_1.protect, transactionController_1.getTransactionHistory);
exports.default = router;
