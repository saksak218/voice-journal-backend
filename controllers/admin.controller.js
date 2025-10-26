import AudioJournal from "../models/audioJournal.model.js";
import User from "../models/user.model.js";

export const getAdminStats = async (req, res, next) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments({ isActive: true });

    // Total audio files
    const totalAudios = await AudioJournal.countDocuments({ isDeleted: false });

    // Storage and duration stats
    const storageStats = await AudioJournal.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: "$fileSize" },
          totalDuration: { $sum: "$duration" },
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    const stats = storageStats[0] || {
      totalBytes: 0,
      totalDuration: 0,
      avgDuration: 0,
    };

    // Calculate storage cost ($0.1 per GB)
    const totalGB = stats.totalBytes / (1024 * 1024 * 1024);
    const storageCost = totalGB * 0.1;

    // Format breakdown by audio format
    const formatStats = await AudioJournal.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$format",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Category breakdown
    const categoryStats = await AudioJournal.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalAudios,
        totalStorageBytes: stats.totalBytes,
        totalStorageGB: totalGB.toFixed(2),
        storageCostUSD: storageCost.toFixed(2),
        totalDurationSeconds: stats.totalDuration,
        avgDurationSeconds: Math.round(stats.avgDuration),
        formatStats,
        categoryStats,
      },
    });
  } catch (error) {
    console.error("Get Admin Stats Error:", error);
    next(error);
    // res.status(500).json({
    //   success: false,
    //   message: "Error fetching admin statistics",
    //   error: error.message,
    // });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // Get audio count for each user
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const audioCount = await AudioJournal.countDocuments({
          userId: user._id,
          isDeleted: false,
        });

        const storageStats = await AudioJournal.aggregate([
          { $match: { userId: user._id, isDeleted: false } },
          {
            $group: {
              _id: null,
              totalStorage: { $sum: "$fileSize" },
            },
          },
        ]);

        const totalStorage = storageStats[0]?.totalStorage || 0;

        return {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          audioCount,
          totalStorageBytes: totalStorage,
          totalStorageMB: (totalStorage / (1024 * 1024)).toFixed(2),
        };
      })
    );

    res.status(200).json({
      success: true,
      count: usersWithActivity.length,
      data: usersWithActivity,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    // res.status(500).json({
    //   success: false,
    //   message: "Error fetching users",
    //   error: error.message,
    // });
    next(error);
  }
};
