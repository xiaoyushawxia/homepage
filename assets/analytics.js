fetch("stats.json")
.then(r => r.json())
.then(async data => {

    document.getElementById("visitor").textContent =
        data.visitors.toLocaleString();

    const list = document.getElementById("countryList");

    data.countries
        .sort((a,b)=>b.value-a.value)
        .slice(0,10)
        .forEach(c=>{

            const div=document.createElement("div");

            div.className="country";

            div.innerHTML =
                `<span>${c.name}</span>
                 <span>${c.value.toLocaleString()}</span>`;

            list.appendChild(div);

        });

    // Load world GeoJSON
    const world = await fetch(
        "https://fastly.jsdelivr.net/npm/echarts@5/map/json/world.json"
    ).then(r => r.json());

    echarts.registerMap("world", world);

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
            text:["High","Low"],
            calculable:true,
            left:"left",
            bottom:20
        },

        series:[{

            type:"map",

            map:"world",

            roam:true,

            emphasis:{
                label:{
                    show:false
                }
            },

            data:data.countries

        }]

    });

});