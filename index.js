var express = require('express')
var cors = require('cors')
const app = express()
const port = 3000

app.use(cors())

const CC = require('currency-converter-lt')

app.get('/', (req, res) => {
    let currencyConverter = new CC()

    try {
        /**
         * The `CC` class actually handles missing or invalid values, so we can use it for input validation.
         */
        currencyConverter.from(req.query.from);
        currencyConverter.to(req.query.to);
        currencyConverter.amount(Number(req.query.amount));
    } catch (e) {
        /**
         * No need to clarify which parameters are wrong or why for our current usecase.
         */
        return res.status(422).json({'message': 'invalid or missing parameters'})
    }

    const promises = []
    /**
     * First we want to directly convert our amount no matter what.
     */
    promises.push(currencyConverter.convert())

    /**
     * But if we don't convert between two non-EUR currencies then we will have to convert them through EUR instead of using a direct conversion.
     * We still want the previous direct conversion to happen just to see the difference between the two.
     */
    if (currencyConverter.currencyFrom !== "EUR" && currencyConverter.currencyTo !== "EUR") {
        promises.push(new Promise((resolve, reject) => {
            new CC({from: currencyConverter.currencyFrom, to: "EUR", amount: currencyConverter.currencyAmount}).convert().then((amountInEur) => {
                new CC({from: "EUR", to: currencyConverter.currencyTo, amount: amountInEur}).convert().then(resolve, reject)
            }, reject)
        }))
    }

    Promise.all(promises).then((responses) => {
        /**
         * responses[0] holds the value of the direct conversion
         * responses[1] holds the direct conversion rates
         * responses[2], when not `undefined` holds the result of converting between the currencies through EUR
         */
        const wasConvertedThroughEur = !!responses[1];
        res.json({
            /**
             * If we converted through EUR then `responses[1]` will not be undefined and we will want to use that value
             */
            convertedAmount: wasConvertedThroughEur ? responses[1] : responses[0],
            /**
             * If we converted through EUR then we still want to know what the direct conversion's value would have been
             */
            directConversionEstimate: wasConvertedThroughEur ? responses[0] : null,
            wasConvertedThroughEur: wasConvertedThroughEur
        })
    })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})