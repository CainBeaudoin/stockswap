(()=>{
  const overviewSelectors=[
    '#portfolioView > .summary-grid',
    '#portfolioPerformance',
    '#portfolioList',
    '#portfolioView > .api-inline'
  ];

  function setPortfolioDetailMode(active){
    const view=document.querySelector('#portfolioView');
    const detail=document.querySelector('#portfolioDetail');
    if(!view||!detail)return;

    overviewSelectors.forEach(selector=>{
      const el=document.querySelector(selector);
      if(el)el.classList.toggle('hidden',active);
    });

    detail.classList.toggle('hidden',!active);
    detail.classList.toggle('on',active);
    view.classList.toggle('stock-detail-mode',active);
  }

  openPosition=function(ticker){
    state.selected=ticker;
    const sellAmount=document.querySelector('#sellAmount');
    if(sellAmount)sellAmount.value='0';
    setPortfolioDetailMode(true);
    renderPosition();
    buildChart('1D');
    save();
    window.scrollTo({top:0,behavior:'smooth'});
  };

  showPortfolioList=function(){
    state.selected=null;
    setPortfolioDetailMode(false);
    save();
  };

  const back=document.querySelector('#backPortfolio');
  if(back)back.onclick=showPortfolioList;

  // Rebind current holding rows because protocol-v2 attached handlers before this override loaded.
  document.querySelectorAll('.position-row').forEach(row=>{
    row.onclick=()=>openPosition(row.dataset.ticker);
  });
})();
