export function parseUserRoles(
  rolesString: string = '',
): Record<number, string> {
  if (!rolesString) {
    console.warn('No USER_ROLES environment variable found');
    return {};
  }

  const roles = rolesString
    .split(',')
    .filter((role) => role.includes(':'))
    .reduce(
      (acc, role) => {
        const [userId, userRole] = role.split(':');
        const parsedId = parseInt(userId);

        if (isNaN(parsedId)) {
          console.warn(`Invalid user ID in role configuration: ${userId}`);
          return acc;
        }

        acc[parsedId] = userRole;
        return acc;
      },
      {} as Record<number, string>,
    );

  return roles;
}
