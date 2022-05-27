var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'main',
        repo: 'https://github.com/gaialivssynssamfunn/innmelding.git', // Update to point to your repository
        user: {
            name: 'Knut Olav Bøhmer', // update to use your name
          email: 'bohmer@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)
