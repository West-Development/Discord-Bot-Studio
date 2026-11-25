module.exports = {
    checkPermission: (member, permission) => member.permissions.has(permission)
};