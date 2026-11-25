module.exports = {
    /**
     * Checks if a member has a specific role.
     * @param {import('discord.js').GuildMember} member 
     * @param {string} roleId 
     * @returns {boolean}
     */
    hasRole: (member, roleId) => {
        return member.roles.cache.has(roleId);
    },

    /**
     * Checks if a member has at least one of the provided roles.
     * @param {import('discord.js').GuildMember} member 
     * @param {string[]} roleIds 
     * @returns {boolean}
     */
    hasAnyRole: (member, roleIds) => {
        return roleIds.some(roleId => member.roles.cache.has(roleId));
    },

    /**
     * Checks if a member has all of the provided roles.
     * @param {import('discord.js').GuildMember} member 
     * @param {string[]} roleIds 
     * @returns {boolean}
     */
    hasAllRoles: (member, roleIds) => {
        return roleIds.every(roleId => member.roles.cache.has(roleId));
    }
};