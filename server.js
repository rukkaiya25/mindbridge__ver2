const app = require('./src/app');

const PORT = 5000;

app.listen(PORT, () => {
    console.log('MindBridge backend running on port ' + PORT);
});

