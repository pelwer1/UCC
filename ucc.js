// !ucc
//
// Script to modify SWADE Compendium creatures to work with my high-efficiency GM macros and workflow
//
// It works by adding a few attribute fields to the character that are ignored by the character sheet code
//
// It also produces a tokenmod command to help you see certain edges and abilities in the token name
//
// !ucc   (update compendium creature)
//
// creates cmd line like this:
//     !token-mod --set name|'?{Short Token Name|Mook} 6/7/14(4) [FSAR2]' statusmarkers|5b-Fear bar3_value|W3 statusmarkers|5-Large:2 defaulttoken
// running this command will prompt you for a new token name and update the default token
//
//
//  char sheet html:  https://raw.githubusercontent.com/finderski/roll20-character-sheets/master/Official%20Savage%20Worlds/SavageWorldsCharSheet.html
//
//
//
// used by jslint tool:  http://www.jslint.com

/* jslint
   for, this, white, long, single, unordered, name
*/
/* global
   Campaign, sendChat, getObj, getAttrByName, on, log, createObj, AddAttribute
*/
/* property
    CheckInstall, RegisterEventHandlers, addCard, cardCount, cardRank, cards,
    clone, combine, concat, content, custom, deal, draw, edges, floor, get, id,
    indexOf, length, longName, makeDeck, name, parse, playerid, pr, push,
    random, rank, replace, reverse, set, shift, shortName, shortname, shuffle,
    sortBy, splice, split, stringify, substr, toktype, type
*/
// Trick from Aaron to fix "Syntax Error: Unexpected Identifier" - put a ";" at top of script
// The API Server concatenates all the scripts together, which can lead to code that isn't
// correct when a programmer relies on automatic semicolon insertion.
;

on('ready', function() {
  on('chat:message', function(msg) {

    // Add a new attribute to a character
    // Usage:   AddAttribute("size",sizeNum,charID);
    function AddAttribute(attr, value, charID) {
       if (value === undefined) {
          log(attr + " has returned an undefined value.");
          sendChat("","Error on " + attr + " attribute", "This attribute has been ignored.");
       }
       // only convert a compendium creature once
       else if (!getAttrByName(charID, "AGI")) { 
          createObj("attribute", {
             name: attr,
             current: value,
             characterid: charID
          });
          //use the line below for diagnostics!
          // sendChat("", "Attribute: Value = " + attr + ": " + value);
       }
       else {
         sendChat("","Error: Attribute: "+attr+" already exists and remains unchanged. This creature was preivously updated with !ucc.");
       }
       return;
    }


    if (msg.type === "api" && msg.content.indexOf("!ucc") !== -1) {

      // Make sure there's a selected object
      if (!msg.selected) {
        sendChat("ERROR", "No Token Selected.");
        return;
      }

      // Don't try to set up a drawing or card
      var token = getObj('graphic', msg.selected[0]._id);
      if (token.get('subtype') !== 'token') {
        sendChat("ERROR", "Must select a Token, not a drawing or a card.");
        return;
      }

      var tokenid = msg.selected[0]._id;
      var charid = getObj("graphic", tokenid).get("represents");
      var c = getObj('character', charid);
      if (!c) {
        sendChat("ERROR", "Must select a Token that is linked to a character sheet.");
        return;
      }

      //
      //  Parse Size and Wounds Attributes
      //
      if (!getAttrByName(c.id, "size")) {
        sendChat("ERROR", "Must select a Token that came from the Compendium: size");
        return;
      }
      var compendData = getAttrByName(c.id, "size");
      var sizeValue = parseInt(compendData);

      if (!getAttrByName(c.id, "wounds","max")) {
        sendChat("ERROR", "Must select a Token that came from the Compendium: wounds|max");
        return;
      }
      compendData = getAttrByName(c.id, "wounds","max");
      var wounds = 1;
      wounds = parseInt(compendData);

      // Wounds and Size Mod
      var large = '';
      if (sizeValue > 3) {
        large = 'statusmarkers|5-Large:2 ';
      }
      if (sizeValue > 7) {
        large = 'statusmarkers|5-Large:4 ';
      }
      if (sizeValue > 11) {
        large = 'statusmarkers|5-Large:6 ';
      }

 
      //
      //  Parse Edges and Special Abilities from Repeating Sections
      //
      //  char sheet html:  https://raw.githubusercontent.com/finderski/roll20-character-sheets/master/Official%20Savage%20Worlds/SavageWorldsCharSheet.html
      //
      // edge names: @{selected|repeating_edges_$1_edge}    count:  edgeCount
      // spec abilty names:  @{selected|repeating_specialabilities_$0_specialability}    count:  specialAbilityCount
      //
      var edges = '';
      var edgeCount = 0;
      var specialCount = 0;
      var i = 0;
      if (!getAttrByName(c.id, "edgeCount"))           {edgeCount = 0;}    else {edgeCount = getAttrByName(c.id, "edgeCount");}
      if (!getAttrByName(c.id, "specialAbilityCount")) {specialCount = 0;} else {specialCount = getAttrByName(c.id, "specialAbilityCount");}
      for (i = 0; i < edgeCount; i++ )    { edges += getAttrByName(c.id, "repeating_edges_$"+i.toString()+"_edge"); }
      for (i = 0; i < specialCount; i++ ) { edges += getAttrByName(c.id, "repeating_specialabilities_$"+i.toString()+"_specialability");      }
      compendData = edges;

      // hardy, resilient
      var hardy = '';
      var regexp = /hardy/i;  // added var
      if (regexp.test(compendData)) {hardy  = 'H ';      }
      regexp = /resilient/i;
      if (regexp.test(compendData)) {wounds = wounds + 1;      }
      regexp = /very\s+resilient/i;
      if (regexp.test(compendData)) {wounds = wounds + 1;      }

      // fear
      var fear = '';
      regexp = /fear/i;
      if (regexp.test(compendData)) {fear = 'statusmarkers|5b-Fear ';      }

      // arcane resistance
      var arcResist = '';
      regexp = /arcane\s+resist/i;
      if (regexp.test(compendData)) {arcResist = 'AR2';      }
      regexp = /imp\w*\s+arc\w*\s+resist/i;
      if (regexp.test(compendData)) {arcResist = 'AR4';      }

      // attacks
      var sweep = '';
      var frenzy = '';
      regexp = /sweep/i;
      if (regexp.test(compendData)) {sweep  = 'S';      }
      regexp = /frenzy/i;
      if (regexp.test(compendData)) {frenzy = 'F';      }
      regexp = /imp\w*\s+frenzy/i;
      if (regexp.test(compendData)) {frenzy = 'iF';      }
      regexp = /claw.*bite/i;
      if (regexp.test(compendData)) {frenzy = 'F';      }
      regexp = /bite.*claw/i;
      if (regexp.test(compendData)) {frenzy = 'F';      }
      regexp = /claws/i;
      if (regexp.test(compendData)) {frenzy = 'F';      }

      // auras  (Aura 2 is available)
      var aura1 = '';
      var aura2 = '';
      regexp = /(extract|first strike|counter att)/i;
      if (regexp.test(compendData)) {        aura1 = "aura1_radius|0.2 aura1_color|FF0000 ";      }

      // combat reflexes (+2 unshake)
      var cbtReflex = '0';
      regexp = /(combat reflex|undead|construct|demon|elemental)/i;
      if (regexp.test(compendData)) {        cbtReflex = '1';      }
      // iron jaw  (+2 soak)
      var ironJaw = '0';
      regexp = /(iron jaw|endurance)/i;
      if (regexp.test(compendData)) {        ironJaw = '1';      }
    
      // Pinnacle folks said they do not plan to fill in InitEdges 
      // in the Official Character Sheet for Compendium creatures 
      var initEdges = '0,'
      if (/Quick/.test(compendData)) {
         initEdges = initEdges + 'Qui,';
      }
      if (/Improved Level Head/.test(compendData)) {
         initEdges = initEdges + 'ILH,';
      }
      if (/Level Head/.test(compendData)) {
         initEdges = initEdges + 'LH,';
      }
      if (/Tactician/.test(compendData)) {
         initEdges = initEdges + 'TT,';
      }
      if (/Master Tactician/.test(compendData)) {
         initEdges = initEdges + 'MTT,';
      }
      if (/(Mighty Blow|Dead Shot)/.test(compendData)) {
         initEdges = initEdges + 'WCE,';
      }
       
      //  AGI, SMA, SPI, STR, VIG  (see vigor_rank attribute for example)
      var AGI = getAttrByName(c.id, "agility_rank");
      var SMA = getAttrByName(c.id, "smarts_rank");
      var SPI = getAttrByName(c.id, "spirit_rank");
      var STR = getAttrByName(c.id, "strength_rank");
      var VIG = getAttrByName(c.id, "vigor_rank");
      var agility = getAttrByName(c.id, "agility") ;// used for Healing, Lore, Survival
      var smarts  = getAttrByName(c.id, "smarts" ); // used for Repair, Thievery, Vehicles
  
      //  Combat (highest of 'fighting' and 'shooting' and 'athletics', fighting_rank or shooting rank has the actual die roll)
      var fighting  = agility;
      var shooting  = 0;
      var athletics = 0;
      if (!getAttrByName(c.id, "fighting" )) {fighting  = agility; } else {fighting  = getAttrByName(c.id, "fighting");  }
      if (!getAttrByName(c.id, "shooting" )) {shooting  = 0;       } else {shooting  = getAttrByName(c.id, "shooting");  }
      if (!getAttrByName(c.id, "athletics")) {athletics = 0;       } else {athletics = getAttrByName(c.id, "athletics"); }
      var combat = getAttrByName(c.id, "fighting_rank");
      if ( parseInt(shooting)  > parseInt(fighting) && parseInt(shooting)  > parseInt(athletics) ) {combat = getAttrByName(c.id, "shooting_rank" ); }
      if ( parseInt(athletics) > parseInt(shooting) && parseInt(athletics) > parseInt(fighting ) ) {combat = getAttrByName(c.id, "athletics_rank"); }


      //  Arcane (highest of faith, spellcasting, psionics, focus, and smarts)
      var arcane = SMA; // if creature in not a caster, use smarts for arcane
      var faith  = 0;
      var spellcasting  = 0;
      var psionics = 0;
      var focus = 0;
      if (!getAttrByName(c.id, "faith"))        {faith         = 0;} else {faith        = getAttrByName(c.id, "faith");}
      if (!getAttrByName(c.id, "spellcasting")) {spellcasting  = 0;} else {spellcasting = getAttrByName(c.id, "spellcasting");}
      if (!getAttrByName(c.id, "psionics"))     {psionics      = 0;} else {psionics     = getAttrByName(c.id, "psionics");}
      if (!getAttrByName(c.id, "focus"))        {focus         = 0;} else {focus        = getAttrByName(c.id, "focus");}
      if (parseInt(faith) > parseInt(spellcasting) && parseInt(faith) > parseInt(psionics) && parseInt(faith) > parseInt(focus) ) {
         arcane = getAttrByName(c.id, "faith_rank");
      }
      if (parseInt(spellcasting) > parseInt(faith) && parseInt(spellcasting) > parseInt(psionics) && parseInt(spellcasting) > parseInt(focus) ) {
         arcane = getAttrByName(c.id, "spellcasting_rank");
      }
      if (parseInt(psionics) > parseInt(faith) && parseInt(psionics) > parseInt(spellcasting) && parseInt(psionics)  > parseInt(focus) ) {
         arcane = getAttrByName(c.id, "psionics_rank");
      }
      if (parseInt(focus) > parseInt(spellcasting) && parseInt(focus) > parseInt(faith) && parseInt(focus)  > parseInt(psionics) ) {
         arcane = getAttrByName(c.id, "psionics_rank");
      }

      //  IntimPers (highest of intimidate, persuasion, taunt, spmarts )
      var intimpers = SMA;
      var intimidation = 0;
      var persuasion = 0;
      var taunt = 0;
      if (getAttrByName(c.id, "intimidation")) {intimidation = getAttrByName(c.id, "intimidation");}
      if (getAttrByName(c.id, "persuasion"))   {persuasion   = getAttrByName(c.id, "persuasion");}
      if (getAttrByName(c.id, "taunt"))        {taunt        = getAttrByName(c.id, "taunt");}
      if ( parseInt(intimidation) > parseInt(persuasion) && parseInt(intimidation) > parseInt(taunt)) {
        intimpers = getAttrByName(c.id, "intimidation_rank");
      }
      if ( parseInt(persuasion) > parseInt(intimidation) && parseInt(persuasion) > parseInt(taunt)) {
        intimpers = getAttrByName(c.id, "persuasion_rank");
      }
      if ( parseInt(taunt) > parseInt(persuasion) && parseInt(taunt) > parseInt(intimidation) )  {
        intimpers = getAttrByName(c.id, "taunt_rank");
      }
      
      //  Athletics, Notice,  Stealth
      athletics = getAttrByName(c.id, "athletics_rank");
      var notice    = getAttrByName(c.id, "notice_rank");
      var stealth   = getAttrByName(c.id, "stealth_rank");

      // Assign all the attributes to the character sheet
      AddAttribute('AGI', AGI, charid);
      AddAttribute('SMA', SMA, charid);
      AddAttribute('SPI', SPI, charid);
      AddAttribute('STR', STR, charid);
      AddAttribute('VIG', VIG, charid);
      AddAttribute('CBT', combat, charid); // best of Fighting, Shooting, Athletics, Agility
      AddAttribute('MDM', 'd8!', charid);  // Melee Damage
      AddAttribute('RDM', '2d6!', charid); // Ranged Damage
      AddAttribute('ARC', arcane, charid); // best of Faith, Spellcasting, Smarts
      AddAttribute('ATH', athletics, charid); // Athletics
      AddAttribute('SOC', intimpers, charid); // best of Intimidation or Persuasion ot Taunt
      AddAttribute('NOT', notice, charid);    // Notice
      AddAttribute('STL', stealth, charid);   // Stealth
      AddAttribute('CBR', cbtReflex, charid);
      AddAttribute('IRJ', ironJaw, charid);
      AddAttribute('InitEdges', initEdges, charid);
    
      // token name PPT(A)
      var pace = 0;
      var parry = 0;
      var toughness = 0;
      var armor = 0;
      var ppta = '';
      if (!getAttrByName(c.id, "pace"          )) {pace      = 6;} else {pace      = getAttrByName(c.id, "pace");}
      if (!getAttrByName(c.id, "parry"         )) {parry     = 6;} else {parry     = getAttrByName(c.id, "parry");}
      if (!getAttrByName(c.id, "toughness"     )) {toughness = 6;} else {toughness = getAttrByName(c.id, "toughness");}
      if (!getAttrByName(c.id, "toughnessArmor")) {armor     = 0;} else {armor     = getAttrByName(c.id, "toughnessArmor");}
      ppta = pace.toString()+"/"+parry.toString()+"/"+toughness.toString()+"("+armor.toString()+"){"+sizeValue.toString()+"}";

      // build the token mod command
      var printOut =  '';
      if ( frenzy || sweep || arcResist ) {
        printOut = "!token-mod --set name|'?{Short Token Name|Mook} " + ppta + " [" + frenzy + sweep + arcResist + "]' " + aura1 + aura2  + fear  + " bar3_value|W" + wounds.toString() + hardy + " " + large;
      }
      else {
        printOut = "!token-mod --set name|'?{Short Token Name|Mook} " + ppta + "' " + aura1 + aura2  + fear  + " bar3_value|W" + wounds.toString() + hardy + " " + large;
      }
      sendChat('', '/w gm <b>Token Mod Command:</b><br>' + printOut + ' defaulttoken<br>');
    }
  });
});
