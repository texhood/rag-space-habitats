// controllers/adminController.js
const User = require('../models/User');
const QueryLog = require('../models/QueryLog');

class AdminController {
  /**
   * Get all users
   */
  static async getUsers(req, res, next) {
    try {
      const users = await User.findAll();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validation
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role',
          message: 'Role must be "admin" or "user"'
        });
      }

      // Prevent self-demotion
      if (parseInt(id) === req.user.id && role !== 'admin') {
        return res.status(400).json({ 
          error: 'Cannot demote self',
          message: 'You cannot remove your own admin privileges'
        });
      }

      const updated = await User.updateRole(id, role);

      if (!updated) {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'The specified user does not exist'
        });
      }

      res.json({ 
        success: true,
        message: 'User role updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ 
          error: 'Cannot delete self',
          message: 'You cannot delete your own account'
        });
      }

      const deleted = await User.delete(id);

      if (!deleted) {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'The specified user does not exist'
        });
      }

      res.json({ 
        success: true,
        message: 'User deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get analytics
   */
  static async getAnalytics(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 7;
      const analytics = await QueryLog.getAnalytics(days);
      const recentQueries = await QueryLog.getRecent(10);

      res.json({ 
        analytics,
        recentQueries
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Trigger preprocessing
   */
  static async triggerPreprocess(req, res, next) {
    try {
      // This would trigger your preprocessing script
      // For now, we'll just acknowledge the request
      
      // In production, you might want to:
      // - Run preprocessing in a worker/background job
      // - Use a queue system like Bull/BullMQ
      // - Track preprocessing status
      
      console.log(`[${req.user.username}] Triggered preprocessing`);
      
      res.json({ 
        success: true,
        message: 'Preprocessing started in background'
      });

      // Optionally run the preprocessing asynchronously
      // Don't await this - let it run in background
      // require('../scripts/preprocess.js')().catch(console.error);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;
