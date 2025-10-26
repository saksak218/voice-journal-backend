import mongoose from "mongoose";
const audioJournalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true, // in bytes
    },
    format: {
      type: String,
      required: true,
      lowercase: true,
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
    category: {
      type: String,
      enum: ["daily", "best-moments", "custom"],
      default: "daily",
    },
    customCategory: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Cloudinary public ID for deletion
    cloudinaryPublicId: {
      type: String,
    },

    // Optional transcription fields
    transcription: String,
    summary: String,
    isTranscribed: {
      type: Boolean,
      default: false,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
audioJournalSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
audioJournalSchema.index({ category: 1 });

// Virtual for file size in MB
audioJournalSchema.virtual("fileSizeMB").get(function () {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Method to soft delete
audioJournalSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};
const AudioJournal = mongoose.model("AudioJournal", audioJournalSchema);

export default AudioJournal;
