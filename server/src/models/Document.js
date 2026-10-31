const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    position: { type: Number, required: true },
    page: { type: Number },
    pages: { type: [Number] },
    embedding: { type: [Number], required: true, select: false }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    originalFilename: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['pdf', 'txt', 'md'],
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    storagePath: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'ready', 'failed'],
      default: 'pending'
    },
    failureReason: {
      type: String,
      default: null
    },
    pinned: {
      type: Boolean,
      default: false
    },
    summary: {
      type: String,
      default: null
    },
    topics: {
      type: [String],
      default: []
    },
    suggestedQuestions: {
      type: [String],
      default: []
    },
    chunks: {
      type: [chunkSchema],
      default: []
    }
  },
  { timestamps: true }
);

documentSchema.methods.toSummary = function toSummary() {
  return {
    id: this._id,
    name: this.name,
    fileType: this.fileType,
    fileSize: this.fileSize,
    status: this.status,
    failureReason: this.failureReason,
    pinned: this.pinned,
    summary: this.summary,
    topics: this.topics,
    suggestedQuestions: this.suggestedQuestions,
    chunkCount: this.chunks ? this.chunks.length : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Document', documentSchema);