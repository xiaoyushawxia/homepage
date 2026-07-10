fetch("stats.json")
.then(r => r.json())
.then(data => {

    document.getElementById("visitor").textContent =
        data.visitors.toLocaleString();

    document.getElementById("pageview").textContent =
        data.pageviews.toLocaleString();

    document.getElementById("countryCount").textContent =
        data.countryCount;

    document.getElementById("updated").textContent =
        "Updated: " + data.updated;

    // ---------- Top Countries ----------

    const list = document.getElementById("countryList");

    data.countries
        .sort((a,b)=>b.value-a.value)
        .slice(0,10)
        .forEach(c=>{

            const div=document.createElement("div");

            div.className="country";

            div.innerHTML=

                `<span>${c.name}</span>
                 <span>${c.value.toLocaleString()}</span>`;

            list.appendChild(div);

        });

    // ---------- World Map ----------

    const chart = echarts.init(
        document.getElementById("worldMap")
    );

    chart.setOption({

        tooltip:{
            trigger:"item"
        },

        visualMap:{
            min:0,
            max:Math.max(...data.countries.map(c=>c.value)),
            left:"left",
            bottom:"10%",
            text:["High","Low"],
            calculable:true
        },

        series:[{

            type:"map",

            map:"world",

            roam:true,

            data:data.countries

        }]

    });

});