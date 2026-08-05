"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = exports.getTickets = void 0;
const SupportTicket_1 = __importDefault(require("../models/SupportTicket"));
const getTickets = async (req, res) => {
    try {
        const tickets = await SupportTicket_1.default.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTickets = getTickets;
const createTicket = async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) {
        res.status(400).json({ message: 'Subject and message are required' });
        return;
    }
    try {
        const ticket = await SupportTicket_1.default.create({
            user: req.user.id,
            subject,
            message,
            status: 'open',
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createTicket = createTicket;
