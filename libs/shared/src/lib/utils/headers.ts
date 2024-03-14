export const getHeaders = (token: any) => {
    return {
        Accept: 'application/json',
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`, //TODO: Discuss how we will authenticate and retrieve token for external calls
    };
};
