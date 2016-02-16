'use strict';
let Helper = require('../helper');
let webdriver = require('selenium-webdriver');
let by = require('protractor').By;
let protractor = require('protractor');
let stringIncludes = require('../assert/include').includes;
let urlEquals = require('../assert/equal').urlEquals;
let equals = require('../assert/equal').equals;
let empty = require('../assert/empty').empty;
let truth = require('../assert/truth').truth;
let xpathLocator = require('../utils').xpathLocator;
let EC = protractor.ExpectedConditions;
let co = require('co');

class Protractor extends Helper {

  constructor(config) {
    super(config);
    this.options = {
      browser: 'firefox',
      url: 'http://localhost',
      seleniumServer: 'localhost',
      seleniumPort: '4444',
      rootElement: 'body',
      scriptsTimeout: 10000
    };   
    this.options = Object.assign(this.options, config);
    if (config.proxy) {
      this.options.desiredCapabilities.proxy = config.proxy;
    }
    global.by = by;
  }  
  
  static _config() {
    return [
      { name: 'url', message: "Base url of site to be tested", default: 'http://localhost' },
      { name: 'browser', message: 'Browser in which testing will be performed', default: 'firefox' },
      { name: 'rootElement', message: "Root element of AngularJS application", default: 'body' },
    ];
  }
  
  _before() {
    let browser = new webdriver.Builder()
      .usingServer(`http://${this.options.seleniumServer}:${this.options.seleniumPort}/wd/hub`)
      .forBrowser(this.options.browser)
      .build();
      
    this.browser = protractor.wrapDriver(browser, this.options.url, this.options.rootElement);
    this.browser.ready = this.browser.manage().timeouts().setScriptTimeout(this.options.scriptsTimeout);    
    this.context = this.options.rootElement;
    return this.browser;
  }  
  
  _after() {
    return this.browser.quit();
  }  

  /**
   * {{> ../webapi/amOnPage }}
   */
  amOnPage(url) {
    if (url.indexOf('http') !== 0) {
      url = this.options.url + url;
    }
    return this.browser.get(url);  
  }
  
  /**
   * {{> ../webapi/click }}
   */
  click(link, context) {    
    let matcher = this.browser;
    if (context) {
      matcher = matcher.element(guessLocator(context) || by.css(context));
    }
    return co(findClickable(matcher, link)).then((el) => el.click());
  }
  
  /**
   * {{> ../webapi/see }}
   */
  see(text, context) {
    return proceedSee.call(this, 'assert', text, context);
  }  
  
  /**
   * {{> ../webapi/dontSee }}
   */
  dontSee(text, context) {
    return proceedSee.call(this, 'negate', text, context);
  }
  
  /**
   * {{> ../webapi/selectOption }}
   */
  selectOption(select, option) {
    return co(findFields(this.browser, select)).then(co.wrap(function*(fields) {    
      if (!fields.length) {
        throw new Error(`Selectable field ${select} not found by name|text|CSS|XPath`);
      }
      if (!Array.isArray(option)) {
        option = [option];
      }
      let field = fields[0];     
      let promises = [];
      for (let key in option) {
        let opt = option[key];
        let normalizedText = `[normalize-space(.) = "${opt.trim() }"]`;
        let byVisibleText = `./option${normalizedText}|./optgroup/option${normalizedText}`;
        let el = field.all(by.xpath(byVisibleText));
        if (!(yield el.count())) {
          let normalizedValue = `[normalize-space(@value) = "${opt.trim() }"]`;
          let byValue = `./option${normalizedValue}|./optgroup/option${normalizedValue}`;
          el = field.all(by.xpath(byValue));
        }
        promises.push(el.click()); 
      }
      return Promise.all(promises);    
    }));
  }
  
  /**
   * {{> ../webapi/fillField }}
   */  
  fillField(field, value) {
    return co(findFields(this.browser, field)).then(co.wrap(function*(els) {
      if (!els.length) {
        throw new Error(`Field ${field} not found by name|text|CSS|XPath`);
      }
      els[0].clear();
      return els[0].sendKeys(value);       
    }));
  }
  
  /**
   * {{> ../webapi/seeInField }}
   */  
  seeInField(field, value) {
    return co.wrap(proceedSeeInField).call(this, 'assert', field, value);
  }

  /**
   * {{> ../webapi/dontSeeInField }}
   */  
  dontSeeInField(field, value) {
    return co.wrap(proceedSeeInField).call(this, 'negate', field, value);
  }
  
  /**
   * {{> ../webapi/appendField }}
   */    
  appendField(field, value) {
    return co(findFields(this.browser, field)).then(co.wrap(function*(els) {
      if (!els.length) {
        throw new Error(`Field ${field} not found by name|text|CSS|XPath`);
      }
      return els[0].sendKeys(value);       
    }));  
  }
  
  /**
   * {{> ../webapi/checkOption }}
   */      
  checkOption(option, context) {
    let matcher = this.browser;
    if (context) {
      matcher = matcher(guessLocator(context) || by.css(context)).first();
    }
    return co(findCheckable(matcher, option)).then((els) => {
      if (!els.length) {         
        throw new Error(`Option ${option} not found by name|text|CSS|XPath`);      
      }
      return els[0].isSelected().then((selected) => {        
        if (!selected) return els[0].click();
      });
    });
  }
  
  /**
   * {{> ../webapi/seeCheckboxIsChecked }}
   */
  seeCheckboxIsChecked(option)
  {
    return co.wrap(proceedIsChecked).call(this, 'assert', option);
  }
  
  /**
   * {{> ../webapi/dontSeeCheckboxIsChecked }}
   */
  dontSeeCheckboxIsChecked(option)
  {
    return co.wrap(proceedIsChecked).call(this, 'negate', option);
  }  
  
  /**
   * {{> ../webapi/grabTextFrom }}
   */      
  grabTextFrom(locator) {
    return this.browser.element(guessLocator(locator) || by.css(locator)).getText();
  }
  
  /**
   * {{> ../webapi/grabValueFrom }}
   */      
  grabValueFrom(locator) {    
    return co(findFields(this.browser, locator)).then(function(els) {
      if (!els.length) {
        throw new Error(`Field ${locator} was not located by name|label|CSS|XPath`);
      }
      return els[0].getAttribute('value');
    });
  }
  
  /**
   * {{> ../webapi/grabAttribute }}
   */      
  grabAttribute(locator, attr) {
    return this.browser.element(guessLocator(locator) || by.css(locator)).getAttribute(attr);
  }
  
  /**
   * {{> ../webapi/seeInTitle }}
   */      
  seeInTitle(text) {
    return this.browser.getTitle().then((title) => {
      return stringIncludes('web page title').assert(text, title);
    });
  }
  
  /**
   * {{> ../webapi/dontSeeInTitle }}
   */      
  dontSeeInTitle(text) {
    return this.browser.getTitle().then((title) => {
      return stringIncludes('web page title').negate(text, title);
    });
  }
  
  /**
   * {{> ../webapi/grabTitle }}
   */      
  grabTitle() {
    return this.browser.getTitle().then((title) => {
      this.debugSection('Title', title);
      return title;
    });
  }
  
  /**
   * {{> ../webapi/seeElement }}
   */      
  seeElement(locator) {
    let els = this.browser.element.all(guessLocator(locator) || by.css(locator));
    return empty('elements').negate(els.count());
  }
  
  /**
   * {{> ../webapi/dontSeeElement }}
   */      
  dontSeeElement(locator) {
    let els = this.browser.element.all(guessLocator(locator) || by.css(locator));
    return empty('elements').assert(els.count());
  }
  
  /**
   * {{> ../webapi/seeInSource }}
   */    
  seeInSource(text) {
    return this.browser.getPageSource().then((source) => {
      return stringIncludes('HTML source of a page').assert(text, source);
    });
  }
  
  /**
   * {{> ../webapi/dontSeeInSource }}
   */      
  donSeeInSource(text) {
    return this.browser.getPageSource().then((source) => {
      return stringIncludes('HTML source of a page').negate(text, source);
    });
  }

  /**
   * {{> ../webapi/executeScript }}
   */    
  executeScript(fn) {
    return this.browser.execute.apply(this.browser, arguments);
  }

  /**
   * {{> ../webapi/executeAsyncScript }}
   */    
  executeAsyncScript(fn) {
    return this.browser.executeAsync.apply(this.browser, arguments);
  }
  
  /**
   * {{> ../webapi/seeInCurrentUrl }}
   */      
  seeInCurrentUrl(urlFragment) {
    return this.browser.getCurrentUrl().then(function (currentUrl) {
      return stringIncludes('url').assert(urlFragment, currentUrl);
    });
  }

  /**
   * {{> ../webapi/dontSeeInCurrentUrl }}
   */    
  dontSeeInCurrentUrl(urlFragment) {
    return this.browser.getCurrentUrl().then(function (currentUrl) {
      return stringIncludes('url').negate(urlFragment, currentUrl);
    });
  }

  /**
   * {{> ../webapi/seeCurrentUrlEquals }}
   */    
  seeCurrentUrlEquals(uri) {
    return this.browser.getCurrentUrl().then((currentUrl) => {
      return urlEquals(this.options.url).assert(uri, currentUrl);
    });
  }

  /**
   * {{> ../webapi/dontSeeCurrentUrlEquals }}
   */    
  dontSeeCurrentUrlEquals(uri) {
    return this.browser.getCurrentUrl().then((currentUrl) => {
      return urlEquals(this.options.url).negate(uri, currentUrl);
    });
  }
  
  /**
   * {{> ../webapi/resizeWindow }}
   */      
  resizeWindow(width, height) {
    if (width === 'maximize') {
      return this.browser.window().maximize();
    }
    return this.browser.window().setSize(width, height);
  }  

  /**
   * {{> ../webapi/waitForElement }}
   */    
  waitForElement(locator, sec) {
    sec = sec || 1;
    let el = this.browser.element(guessLocator(locator) || by.css(locator)); 
    return this.browser.wait(EC.presenceOf(el), sec*1000);    
  }  
  
  /**
   * Waits for element to become clickable for number of seconds.
   */      
  waitForClickable(locator, sec) {
    sec = sec || 1;
    let el = this.browser.element(guessLocator(locator) || by.css(locator));
    return this.browser.wait(EC.elementToBeClickable(el), sec*1000);    
  }
  
  /**
   * {{> ../webapi/waitForVisible }}
   */      
  waitForVisible(locator, sec) {
    sec = sec || 1;
    let el = this.browser.element(guessLocator(locator) || by.css(locator));
    return this.browser.wait(EC.visibilityOf(el), sec*1000);    
  }      
  
  /**
   * {{> ../webapi/waitForText }}
   */      
  waitForText(text, sec, context) {
    if (!context) {
      context = this.context;
    }
    let el = this.browser.element(guessLocator(context) || by.css(context));
    sec = sec || 1;
    return this.browser.wait(EC.textToBePresentInElement(el), text, sec*1000);    
  }      
  
  // ANGULAR SPECIFIC  
  
  moveTo(path) {
    return this.browser.setLocation(path);
  }
  
  refresh() {
    return this.browser.refresh();
  }
  
  haveModule(modName, fn) {
    return this.browser.addMockModule(modName, fn);    
  }
  
  resetModule(modName) {
    if (!modName) {
      return this.browser.clearMockModules();
    }
    return this.browser.removeMockModule(modName);
  }
}

module.exports = Protractor;

function *findCheckable(client, locator) {
  let matchedLocator = guessLocator(locator); 
  if (matchedLocator) {
    return client.element.all(matchedLocator);
  }
  let literal = xpathLocator.literal(locator);
  let byText = xpathLocator.combine([
    `.//input[@type = 'checkbox' or @type = 'radio'][(@id = //label[contains(normalize-space(string(.)), ${literal})]/@for) or @placeholder = ${literal}]`,
    `.//label[contains(normalize-space(string(.)), ${literal})]//input[@type = 'radio' or @type = 'checkbox']`
  ]);
  let els = client.element.all(by.xpath(byText));
  let count = yield els.count()
  if (count) {
    return els;
  }
  let byName = `.//input[@type = 'checkbox' or @type = 'radio'][@name = ${literal}]`;
  els = client.element.all(by.xpath(byName));
  count = yield els.count()
  if (count) {
    return els;
  }
  return yield client.element.all(by.css(locator));  
}

function *findFields(client, locator) {
  let matchedLocator = guessLocator(locator); 
  if (matchedLocator) {
    return client.element.all(matchedLocator);
  }
  let literal = xpathLocator.literal(locator);
  
  let byLabelEquals = xpathLocator.combine([ 
    `.//*[self::input | self::textarea | self::select][not(./@type = 'submit' or ./@type = 'image' or ./@type = 'hidden')][((./@name = ${literal}) or ./@id = //label[normalize-space(string(.)) = ${literal}]/@for or ./@placeholder = ${literal})]`,
    `.//label[normalize-space(string(.)) = ${literal}]//.//*[self::input | self::textarea | self::select][not(./@type = 'submit' or ./@type = 'image' or ./@type = 'hidden')]`
  ]);
  let els = client.element.all(by.xpath(byLabelEquals));
  if (yield els.count()) {
    return els;
  }
  
  let byLabelContains = xpathLocator.combine([
    `.//*[self::input | self::textarea | self::select][not(./@type = 'submit' or ./@type = 'image' or ./@type = 'hidden')][(((./@name = ${literal}) or ./@id = //label[contains(normalize-space(string(.)), ${literal})]/@for) or ./@placeholder = ${literal})]`,
    `.//label[contains(normalize-space(string(.)), ${literal})]//.//*[self::input | self::textarea | self::select][not(./@type = 'submit' or ./@type = 'image' or ./@type = 'hidden')]`
  ]);
  els = client.element.all(by.xpath(byLabelContains));
  if (yield els.count()) {
    return els;
  }  
  let byName = `.//*[self::input | self::textarea | self::select][@name = ${literal}]`;
  els = client.element.all(by.xpath(byName));
  if (yield els.count()) {
    return els;
  }
  return client.element.all(by.css(locator));
}

function proceedSee(assertType, text, context) {
  let description;
  if (!context) {
    context = this.context;
    if (this.context === 'body') {
      description = 'web page';
    } else {
      description = 'current context ' + this.context;
    }
  } else {
    description = 'element ' + context;
  }
  return this.browser.element(guessLocator(context) || by.css(context)).getText().then(function (source) {
    return stringIncludes(description)[assertType](text, source);
  });
}

function *proceedSeeInField(assertType, field, value) {
  let els = yield co(findFields(this.browser, field));
  if (!els.length) {
    throw new Error(`Field ${field} not found by name|text|CSS|XPath`);
  }
  let el = els[0];
  let tag = yield el.getTagName();  
  let fieldVal = yield el.getAttribute('value');
  if (tag == 'select') {
    // locate option by values and check them      
    let text = yield el.element(by.xpath(`./option[@value=${xpathLocator.literal(fieldVal)}]`)).getText();
    return equals('select option by ' + field)[assertType](value, text);
  }
  return stringIncludes('field by ' + field)[assertType](value, fieldVal);
}

function *proceedIsChecked(assertType, option) {
  return co(findCheckable(this.browser, option)).then((els) => {
    if (!els.length) {         
      throw new Error(`Option ${option} not found by name|text|CSS|XPath`);      
    }
    let elsSelected = [];
    els.forEach(function (el) {      
      elsSelected.push(el.isSelected());
    });
    return Promise.all(elsSelected).then(function(values) {
      let selected = values.reduce((prev, cur) => prev || cur)
      return truth(`checkable ${option}`, 'to be checked')[assertType](selected);
    });
  });  
}

function *findClickable(matcher, locator) {
  let l = guessLocator(locator);
  if (guessLocator(locator)) {
    return matcher.element(l);
  }

  let literal = xpathLocator.literal(locator);

  let narrowLocator = xpathLocator.combine([
    `.//a[normalize-space(.)=${literal}]`,
    `.//button[normalize-space(.)=${literal}]`,
    `.//a/img[normalize-space(@alt)=${literal}]/ancestor::a`,
    `.//input[./@type = 'submit' or ./@type = 'image' or ./@type = 'button'][normalize-space(@value)=${literal}]`
  ]);
  let els = matcher.element.all(by.xpath(narrowLocator));
  if (yield els.count()) {
    return els.first();
  }
  
  let wideLocator = xpathLocator.combine([
    `.//a[./@href][((contains(normalize-space(string(.)), ${literal})) or .//img[contains(./@alt, ${literal})])]`,
    `.//input[./@type = 'submit' or ./@type = 'image' or ./@type = 'button'][contains(./@value, ${literal})]`,
    `.//input[./@type = 'image'][contains(./@alt, ${literal})]`,
    `.//button[contains(normalize-space(string(.)), ${literal})]`,
    `.//input[./@type = 'submit' or ./@type = 'image' or ./@type = 'button'][./@name = ${literal}]`,
    `.//button[./@name = ${literal}]`
  ]);

  els = matcher.element.all(by.xpath(wideLocator));
  if (yield els.count()) {
    return els.first();
  }
  if (isXPath(locator)) {
    return matcher.element(by.xpath(locator));
  }
  return matcher.element(by.css(locator));
}

function guessLocator(locator) {
  if (typeof (locator) === 'object') {
    let key = Object.keys(locator)[0];
    let value = locator[key];
    return by[key](value);
  }  
  if (isCSS(locator)) {
    return by.css(locator);
  }
  if (isXPath(locator)) {
    return by.xpath(locator);
  }
}

function isCSS(locator) {
  return locator[0] === '#' || locator[0] === '.';
}

function isXPath(locator) {
  return locator.substr(0, 2) === '//' || locator.substr(0, 3) === './/' 
}