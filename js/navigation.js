/* KK Fashion navigation */
function kkCurrentPage(){ return window.location.pathname.split("/").pop() || "index.html"; }
function kkHighlightActiveNav(){
  const page=kkCurrentPage();
  document.querySelectorAll("[data-nav-page]").forEach(link=>link.classList.toggle("active", link.getAttribute("data-nav-page")===page));
}
function kkGoToCategory(categoryName){
  const category=String(categoryName||"").trim();
  const url=new URL("products.html", window.location.href);
  if(category) url.searchParams.set("category", category);
  window.location.assign(url.href);
}
function kkWireCategoryTabs(){
  document.querySelectorAll("[data-category-link]").forEach(el=>{
    el.addEventListener("click", e=>{
      e.preventDefault(); e.stopPropagation();
      kkGoToCategory(el.getAttribute("data-category-link"));
    });
  });
}
document.addEventListener("DOMContentLoaded",()=>{ kkHighlightActiveNav(); kkWireCategoryTabs(); });
