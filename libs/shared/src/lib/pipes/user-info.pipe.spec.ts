import { ParseUserInfoPipe } from './user-info.pipe';

describe('ParseUserInfoPipe', () => {
    let pipe: ParseUserInfoPipe;

    beforeEach(() => {
        pipe = new ParseUserInfoPipe();
    });

    it('should extract user info from keycloak access token', async () => {
        const data = {
            exp: 1710354393,
            sub: 'b07c5d62-13ae-448b-a812-d0313c4ece70',
            typ: 'Bearer',
            azp: 'local-notifications-component',
            name: 'Local Tester',
            preferred_username: 'localtester',
            given_name: 'Local',
            family_name: 'Tester',
            email: 'localtester@suite5.eu',
        };

        expect(await pipe.transform(data)).toEqual({
            id: data.sub,
        });
    });
});
