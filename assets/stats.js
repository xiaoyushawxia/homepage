fetch("stats.json")

.then(r=>r.json())

.then(data=>{

document.getElementById("visitor").textContent=data.visitors;

document.getElementById("pageview").textContent=data.pageviews;

document.getElementById("updated").textContent=
"Updated: "+data.updated;

let html="<ul>";

data.countries.forEach(c=>{

html+=`<li>${c.country}: ${c.count}</li>`;

});

html+="</ul>";

document.getElementById("country-list").innerHTML=html;

});