import { BetaAnalyticsDataClient } from "@google-analytics/data";
import fs from "fs";

const credentials = JSON.parse(process.env.GA_CREDENTIALS);

const client = new BetaAnalyticsDataClient({
    credentials
});

const property = `properties/${process.env.GA_PROPERTY_ID}`;

async function run(){

    //------------------------
    // total users
    //------------------------

    const [userReport] = await client.runReport({

        property,

        metrics:[
            {name:"totalUsers"},
            {name:"screenPageViews"}
        ],

        dateRanges:[
            {
                startDate:"365daysAgo",
                endDate:"today"
                
                // startDate:"2026-07-01",
                // endDate:"2026-07-11"
            }
        ]
    });

    console.log(
        JSON.stringify(userReport,null,2)
    );

    //------------------------
    // countries
    //------------------------

    const [countryReport] = await client.runReport({

        property,

        dimensions:[
            {name:"country"}
        ],

        metrics:[
            {name:"totalUsers"}
        ],

        dateRanges:[
            {
                startDate:"365daysAgo",
                endDate:"today"
            }
        ],

        limit:10

    });

    let visitors = 0;
    // let pageviews = 0;

    if (userReport.rows && userReport.rows.length > 0) {

        visitors =
            Number(userReport.rows[0].metricValues[0].value);

        // pageviews =
        //     Number(userReport.rows[0].metricValues[1].value);

    }

    const countries = (countryReport.rows || []).map(r => ({
        name: r.dimensionValues[0].value,
        value: Number(r.metricValues[0].value)
    }));

    const output = {

        visitors,

        // pageviews,

        // countryCount: countries.length,

        countries,

        // updated: new Date().toISOString().substring(0,10)

    };

    fs.writeFileSync(

        "../stats.json",

        JSON.stringify(output,null,2)

    );

}

run();