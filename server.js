const express = require('express');
const app = express();
const PORT = process.env.PORT || 80;


app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use('/api/user', require('./backend/routes/userRoutes'));
app.get('/', (req, res) => {
    res.json({'message':'Hello'})
})

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
