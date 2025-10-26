import AudioJournal from "../models/audioJournal.model.js";
import { cloudinary } from "../config/cloudinary.js";

const getAudioDuration = (file) => {
  return file.duration || 0;
};

export const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Please upload an audio file");
      error.statusCode = 400;
      throw error;
    }
    console.log(req.user);
    const { title, category, customCategory, tags } = req.body;
    const fileUrl = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const format = req.file.format || req.file.mimetype.split("/")[1];
    const duration = req.file.duration || 0;
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
    }
    // Create audio journal
    const audioJournal = await AudioJournal.create({
      userId: req.user._id,
      title: title || fileName,
      fileUrl,
      fileName,
      fileSize,
      format,
      duration,
      category: category || "daily",
      customCategory: category === "custom" ? customCategory : undefined,
      tags: parsedTags,
      cloudinaryPublicId: req.file.public_id, // Store for deletion
    });
    res.status(201).json({
      success: true,
      message: "Audio uploaded successfully",
      data: audioJournal,
    });
  } catch (error) {
    console.log("Upload Error: ", error);
    next(error);
  }
};

export const getAudioJournals = async (req, res, next) => {
  try {
    const {
      category,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build query
    const query = {
      userId: req.user.id,
      isDeleted: false,
    };

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Search by title
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // Get audio journals
    const audioJournals = await AudioJournal.find(query)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: audioJournals.length,
      data: audioJournals,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

export const getAudioJournal = async (req, res, next) => {
  try {
    const audioJournal = await AudioJournal.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!audioJournal) {
      const error = new Error("Audio journal not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: audioJournal,
    });
  } catch (error) {
    console.error("Get Audio Journal Error:", error);
    next(error);
  }
};

export const updateAudioJournal = async (req, res, next) => {
  try {
    const { title, category, customCategory, tags } = req.body;

    const audioJournal = await AudioJournal.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!audioJournal) {
      const error = new Error("Audio journal not found");
      error.statusCode = 404;
      throw error;
    }

    // Update fields
    if (title) audioJournal.title = title;
    if (category) audioJournal.category = category;
    if (category === "custom" && customCategory) {
      audioJournal.customCategory = customCategory;
    }
    if (tags) audioJournal.tags = tags;

    await audioJournal.save();

    res.status(200).json({
      success: true,
      message: "Audio journal updated successfully",
      data: audioJournal,
    });
  } catch (error) {
    console.error("Update Audio Journal Error:", error);
    next(error);
  }
};

export const deleteAudioJournal = async (req, res, next) => {
  try {
    const audioJournal = await AudioJournal.findOne({
      _id: req.params.id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!audioJournal) {
      const error = new Error("Audio journal not found");
      error.statusCode = 404;
      throw error;
    }

    // Delete from Cloudinary
    if (audioJournal.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(audioJournal.cloudinaryPublicId, {
        resource_type: "video",
      });
    }

    // Soft delete
    audioJournal.isDeleted = true;
    audioJournal.deletedAt = new Date();
    await audioJournal.save();

    res.status(200).json({
      success: true,
      message: "Audio journal deleted successfully",
    });
  } catch (error) {
    console.error("Delete Audio Journal Error:", error);
    next(error);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    console.log("stats");
    const stats = await AudioJournal.aggregate([
      {
        $match: {
          userId: req.user._id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalAudios: { $sum: 1 },
          totalStorage: { $sum: "$fileSize" },
          totalDuration: { $sum: "$duration" },
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    // Category breakdown
    const categoryStats = await AudioJournal.aggregate([
      {
        $match: {
          userId: req.user._id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = stats[0] || {
      totalAudios: 0,
      totalStorage: 0,
      totalDuration: 0,
      avgDuration: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        ...result,
        categories: categoryStats,
      },
    });
  } catch (error) {
    console.error("Get Stats Error:", error);
    next(error);
  }
};
