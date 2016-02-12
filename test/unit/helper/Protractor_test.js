'use strict';

let Protractor = require('../../../lib/helper/Protractor');
let site_url = 'http://davertmik.github.io/angular-demo-app';
let assert = require('assert');
let I, browser;
let path = require('path');

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;

describe('Protractor', function() {
  this.timeout(20000);
  
  before(() => {
    global.codecept_dir = path.join(__dirname, '../../data');
    I = new Protractor({url: site_url});
  });
  
  beforeEach(() => {
    return browser = I._before();
  });
  
  afterEach(() => {
    return I._after();
  });  
  
  describe('open page : #amOnPage', () => {
    it('should open main page of configured site', () => {
      I.amOnPage('/');
      return expect(browser.getCurrentUrl()).to.eventually.equal(site_url+'/#/');
    });
    
    it('should open absolute url', () => {
      I.amOnPage(site_url);
      return expect(browser.getCurrentUrl()).to.eventually.equal(site_url+'/#/');
    });
  });
  
  describe('current url : #seeInCurrentUrl, #seeCurrentUrlEquals, ...', () => {
    it('should check for url fragment', () => {
      I.amOnPage(site_url+'/#/info');
      I.seeInCurrentUrl('/info');
      return I.dontSeeInCurrentUrl('/result');
    });
    
    it('should check for equality', () => {
      I.amOnPage('/#/info');
      I.seeCurrentUrlEquals('/#/info');
      return I.dontSeeCurrentUrlEquals('/#/result');
    });
  });    
  
  describe('see text : #see', () => {
    it('should check text on site', () => {
      I.amOnPage('/');
      I.see('Description');
      return I.dontSee('Create Event Today');
    });    
    
    it('should check text inside element', () => {
      I.amOnPage('/#/info');
      I.see('About', 'h1');
      I.see('Welcome to event app', {css: 'p.jumbotron'});
      return I.see('Back to form', '//div/a');      
    });    
  });
  
  describe('see element : #seeElement, #dontSeeElement', () => {
    
  });
  

});