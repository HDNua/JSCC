/* common.js */

/**
문자가 숫자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_digit(ch) {
  return ('0' <= ch && ch <= '9');
}

/**
소문자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_lower(ch) {
  return ('a' <= ch && ch <= 'z');
}

/**
대문자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_upper(ch) {
  return ('A' <= ch && ch <= 'Z');
}

/**
알파벳이라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_alpha(ch) {
  return is_lower(ch) || is_upper(ch);
}

/**
알파벳 또는 숫자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_alnum(ch) {
  return is_digit(ch) || is_alpha(ch);
}

/**
공백이라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_space(ch) {
  return (ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n');
}

/**
식별자 문자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_namch(ch) {
  return is_alnum(ch) || (ch == '_');
}
/**
첫 식별자 문자라면 참입니다.
@param {string} ch
@return {boolean}
*/
function is_fnamch(ch) {
  return is_alpha(ch) || (ch == '_');
}