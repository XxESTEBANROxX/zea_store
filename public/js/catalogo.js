// ZEA STORE · lógica del catálogo (filtros, búsqueda, tema claro/oscuro)
var ZEA = window.ZEA || {};   // datos que entrega Flask (ver catalogo.html)
var WA_NUMBER = ZEA.waNumber;
var CATS = ZEA.categorias;
var AV = ["Todos","Disponible","Agotado"];
var P = ZEA.productos.map(function(x){return {n:x.nombre,b:x.marca,c:x.categoria,e:x.emoji,ok:x.disponible}});
var S = {cat:"Todos",av:"Todos",q:""};
function $(i){return document.getElementById(i)}
function btns(box,list,key,cls){
  box.innerHTML="";
  list.forEach(function(t){
    var b=document.createElement("button");b.type="button";b.textContent=t;
    if(cls)b.className=cls;
    b.setAttribute("aria-pressed",S[key]===t);
    b.onclick=function(){S[key]=t;draw()};
    box.appendChild(b);
  });
}
function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function draw(){
  btns($("cats"),CATS,"cat","chip");btns($("avail"),AV,"av");
  var q=norm(S.q);
  var r=P.filter(function(p){
    return (S.cat==="Todos"||p.c===S.cat)&&(S.av==="Todos"||(S.av==="Disponible")===p.ok)&&(!q||norm(p.n+" "+p.b+" "+p.c).indexOf(q)>-1);
  });
  $("count").textContent=r.length+(r.length===1?" producto":" productos");
  $("grid").innerHTML=r.length?r.map(function(p){
    var msg=encodeURIComponent("Hola, quiero información sobre: "+p.n+" ("+p.b+")");
    return '<article class="card"><div class="tile" aria-hidden="true">'+p.e+'</div><div class="info"><span class="brandn">'+p.b+'</span><h2 class="name">'+p.n+'</h2><span class="badge'+(p.ok?'':' off')+'">'+(p.ok?'Disponible':'Agotado')+'</span><a class="wa'+(p.ok?'':' alt')+'" target="_blank" rel="noopener" href="https://wa.me/'+WA_NUMBER+'?text='+msg+'">'+(p.ok?'Consultar por WhatsApp':'Preguntar cuándo llega')+'</a></div></article>';
  }).join(""):'<p class="empty">No encontramos productos con esos filtros. Prueba otra categoría o escríbenos por WhatsApp.</p>';
}
$("q").oninput=function(){S.q=this.value;draw()};
function dark(){var t=document.documentElement.getAttribute("data-theme");return t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches}
function icon(){$("th").textContent=dark()?"☀️":"🌙"}
$("th").onclick=function(){
  var n=dark()?"light":"dark";document.documentElement.setAttribute("data-theme",n);
  try{localStorage.setItem("zea-theme",n)}catch(e){}
  icon();
};
try{var s=localStorage.getItem("zea-theme");if(s)document.documentElement.setAttribute("data-theme",s)}catch(e){}
icon();draw();
