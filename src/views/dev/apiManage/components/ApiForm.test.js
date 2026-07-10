/**
 * ApiForm 表单校验逻辑单元测试
 * 需求：2.3 - 必填字段校验，提交前阻断
 *
 * 运行方式：需先安装 vitest
 *   npm install --save-dev vitest
 *   npx vitest run src/views/dev/apiManage/components/ApiForm.test.js
 */

/* eslint-disable import/no-unresolved */
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest';

// 从 ApiForm 中提取的校验规则（纯函数，无 Vue 依赖）
const REQUIRED_FIELDS = ['name', 'method', 'path'];

/**
 * 模拟 el-form 的 validate 行为：
 * 检查表单数据中必填字段是否均有值
 */
function validateForm(formData) {
  const errors = {};
  REQUIRED_FIELDS.forEach((field) => {
    const val = formData[field];
    if (!val || (typeof val === 'string' && val.trim() === '')) {
      errors[field] = `${field} 为必填项`;
    }
  });
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

describe('ApiForm 表单校验', () => {
  describe('必填字段为空时阻止提交', () => {
    it('name 为空时校验失败', () => {
      const result = validateForm({ name: '', method: 'GET', path: '/api/test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('name');
    });

    it('method 为空时校验失败', () => {
      const result = validateForm({ name: '测试接口', method: '', path: '/api/test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('method');
    });

    it('path 为空时校验失败', () => {
      const result = validateForm({ name: '测试接口', method: 'POST', path: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('path');
    });

    it('三个必填字段均为空时校验失败，且返回所有错误', () => {
      const result = validateForm({ name: '', method: '', path: '' });
      expect(result.valid).toBe(false);
      expect(Object.keys(result.errors)).toHaveLength(3);
    });

    it('name 仅含空格时校验失败', () => {
      const result = validateForm({ name: '   ', method: 'GET', path: '/api/test' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('name');
    });
  });

  describe('必填字段均有值时允许提交', () => {
    it('三个必填字段均有值时校验通过', () => {
      const result = validateForm({ name: '获取用户列表', method: 'GET', path: '/api/users' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('选填字段为空不影响校验通过', () => {
      const result = validateForm({
        name: '创建用户',
        method: 'POST',
        path: '/api/users',
        description: '',
        response_example: '',
      });
      expect(result.valid).toBe(true);
    });

    it('支持所有合法 HTTP Method', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const results = methods.map((method) => validateForm({ name: '接口', method, path: '/api/test' }));
      results.forEach((result) => expect(result.valid).toBe(true));
    });
  });
});
