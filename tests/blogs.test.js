const Page = require('./helpers/page');

let page;

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

describe('when logged in', async () => {
  beforeEach(async () => {
    await page.login();
    await page.click('a.btn-floating');
  });

  test('can see create blog form', async () => {
    const label = await page.getContentsOf('form label');
    expect(label).toEqual('Blog Title');
  });

  describe('and using invalid inputs', async () => {
    beforeEach(async () => {
      await page.click('form button');
    });

    test('the form shows an error message', async () => {
      const titleError = await page.getContentsOf('.title .red-text');
      const contentError = await page.getContentsOf('.content .red-text');

      expect(titleError).toEqual('You must provide a value');
      expect(contentError).toEqual('You must provide a value');
    });
  });

  describe('and using valid inputs', async () => {
    beforeEach(async () => {
      await page.type('.title input', 'My title');
      await page.type('.content input', 'My content');
      await page.click('form button');
    });

    test('submitting takes user to validation screen', async () => {
      const text = await page.getContentsOf('h5');
      expect(text).toEqual('Please confirm your entries');
    });

    test('Submitting and saving adds blogs to list of blogs', async () => {
      await page.click('button.green');
      await page.waitFor('.card');

      const title = await page.getContentsOf('.card-title');
      expect(title).toEqual('My title');
    });
  })
  
});

describe('user is not logged in', async () => {
  test('User cannot create blog posts', async () => {

    const response = await page.evaluate(
      () => {
        return fetch('/api/blogs', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({title: 'My title', content: 'My Content'})
        }).then(res => res.json());
      }
    )
    
    expect(response).toEqual({error: 'You must log in!'})
  });

  test('User cannot get a list of posts', async () => {
    const response = await page.evaluate(
      () => {
        return fetch('/api/blogs', {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.json());
      }
    )
    
    expect(response).toEqual({error: 'You must log in!'})
  });
});