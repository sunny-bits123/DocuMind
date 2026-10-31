const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    filename: String,
    position: Number,
    page: Number,
    pages: [Number],
    excerpt: String
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'bot'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sources: {
      type: [sourceSchema],
      default: []
    }
  },
  { timestamps: true }
);

messageSchema.methods.toSummary = function toSummary() {
  return {
    id: this._id,
    role: this.role,
    content: this.content,
    sources: this.sources,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Message', messageSchema);
