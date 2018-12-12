/***********************************************
* Random Order Content (from DIVs) script- by JavaScript Kit (www.javascriptkit.com)
* This notice must stay intact for usage
* Visit JavaScript Kit at http://www.javascriptkit.com/ for this script and 100s more
***********************************************/

if (document.getElementById) {
  document.documentElement.className = 'jsclass'; //hide content for DOM capable browsers
}

var randomordercontentdisplay={
  divholders:new Object(),
  masterclass: "randomordercontent",

  init:function(){
	if (!document.getElementById)
		return

	var alldivs=document.getElementsByTagName("div")
	var randomcontentsearch=new RegExp(this.masterclass+"\\s+(group\\d+)", "i") //check for CSS class="randomcontent groupX" (x=integer)

	for (var i=0; i<alldivs.length; i++){
		if (randomcontentsearch.test(alldivs[i].className)){
			if (typeof this.divholders[RegExp.$1]=="undefined"){ //if object to hold this group of divs doesn't exist yet
				this.divholders[RegExp.$1]=new Object() //create object
				this.divholders[RegExp.$1].ref=[] //create array to hold each div within group
				this.divholders[RegExp.$1].contents=[] //create array to hold each div's content within group
			}
			
			this.divholders[RegExp.$1].ref.push(alldivs[i]) //add this div to the array
			this.divholders[RegExp.$1].contents.push(alldivs[i].innerHTML) //add this div's content to the array
		}
	}
    
	this.scrambleorder()
},

scrambleorder:function(){
	for (group in this.divholders){ //loop thru each array within object
		this.divholders[group].contents.sort(function() {return 0.5 - Math.random()}) //scramble contents array
        for (var i=0; i<this.divholders[group].ref.length; i++){
				this.divholders[group].ref[i].innerHTML = this.divholders[group].contents[i]
				this.divholders[group].ref[i].style.display="inline-block"
            }
        }
	}
}

