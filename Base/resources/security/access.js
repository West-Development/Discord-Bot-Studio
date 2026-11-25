module.exports = {
    isOwner: (userId, ownerId) => userId === ownerId,
    hasRole: (member, roleId) => member.roles.cache.has(roleId),
    hasPermission: (member, permission) => member.permissions.has(permission)
};