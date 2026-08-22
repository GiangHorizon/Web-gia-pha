function isAdmin(req, res, next) {

    if (req.user.role !== "Admin") {

        return res.status(403).json({
            success: false,
            message: "Chỉ Admin mới được phép."
        });

    }

    next();

}

function isMember(req, res, next) {

    if (
        req.user.role !== "Admin" &&
        req.user.role !== "Member"
    ) {

        return res.status(403).json({
            success: false,
            message: "Không có quyền."
        });

    }

    next();

}

module.exports = {
    isAdmin,
    isMember
};