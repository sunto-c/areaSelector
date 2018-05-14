/**
 * Created by henian.xu on 2018/3/8.
 *
 */

var $ = require('jquery');
require('select2');
require('components/select2/i18n/zh-CN');

function emptyFn() {
}

var cfg = {},
    defaultOptions = {
        childUrl: '/view/region/getSubsetRegion',
        loadAllUrl: '/view/region/loadAllRegion',
        el: '', // 承载容器
        placeholder: '请选择',
        /**
         * parentId 上级地区ID
         * parentId 和 startLevel 无需同时定义；
         * parentId 和 startLevel 都为空，则默认加载 startLevel = 2 的地区数据
         *
         * startLevel 不为空 parentId 废弃
         */
        parentId: void(0),
        startLevel: void(0), // 开始层级 1：州；2：国家；3：省；4：市；5：区/县；6：街道
        endLevel: void(0), // 结束层级（通常用于限制地区联动范围） 1：州；2：国家；3：省；4：市；5：区/县；6：街道
        regionId: void(0), // 用于初始到某个区域
        firstPriority: false, // false: parentId,true:startLevel

        // 事件
        beforeCreate: emptyFn,
        created: emptyFn,
        change: emptyFn,
    };

// 公用方法
function createdDoc(tag, attr, data) {
    var $warp = $('<span class="area-select"></span>');
    var $node = $('<' + tag + '>');
    $.each(attr, function(name, value) {
        $node.attr(name, value);
    });
    $.each(data, function(key, value) {
        $node.data(key, value);
    });
    $warp.append($node);
    return $warp;
}

// 区域选择器类
function AreaSelector(options) {
    cfg = $.extend({}, defaultOptions, options);

    // 没有承载容器
    if (!cfg.el) throw new Error('el (承载容器)为必选项目');
    cfg.$el = $(cfg.el);
    if (
        (typeof cfg.parentId !== 'undefined')
        && (typeof cfg.startLevel !== 'undefined')
    ) {
        throw new Error('不允许同时定义 parentId 跟 startLevel');
    }
    // 默认 startLevel
    if (
        (typeof cfg.parentId === 'undefined')
        && (typeof cfg.startLevel === 'undefined')
    ) {
        cfg.startLevel = 2;
    }

    this.init();
    this.bind();
}

var prot = AreaSelector.prototype;
prot.init = function() {
    var self = this;
    cfg.beforeCreate();
    if (cfg.regionId) {
        $.ajax({
            url: cfg.loadAllUrl,
            type: 'get',
            data: {
                regionId: cfg.regionId,
                startLevel: cfg.startLevel,
            },
        }).success(function(result) {
            if (!result.success) {
                alert(result.msg);
                return;
            }
            $.each(result.data, function(index, item) {
                if (!item.length) return;
                var selectData = $.map(item, function(obj) {
                    obj.text = obj.text || obj.name;
                    return obj;
                });
                self.createChild(
                    (index === 0 && cfg.firstPriority) ? item[0].lv : item[0].parentId,
                    selectData,
                    index
                );
            });
            cfg.created();
        });
    } else {
        this.createChild(cfg.parentId);
        cfg.created();
    }
};
prot.createChild = function(parentId, data, index) {
    var $areaSelect = createdDoc('select', {}, {level: 1,});
    var $select = $areaSelect.children('select');
    cfg.$el.append($areaSelect);
    data && data.length && $select.select2({data: data});
    $select.select2({
        language: 'zh-CN',
        insertBefore: true,
        placeholder: '请选择',
        // minimumResultsForSearch: Infinity,//隐藏搜索框
        ajax: {
            url: cfg.childUrl,
            dataType: 'json',
            type: 'GET',
            delay: 250,//延迟
            cache: true,//缓存
            //传递的参数
            data: function(params) {
                var data = {
                    keyword: params.term, // search term
                    parentId: parentId,
                    // startLevel: cfg.startLevel,
                    endLevel: cfg.endLevel,
                    currPage: params.page,
                };
                if (index === 0 && cfg.firstPriority) {
                    data.startLevel = data.parentId;
                    delete data.parentId;
                }
                return data;
            },
            //后台数据返回
            processResults: function(data, params) {
                params.page = params.page || 1;
                for (var i = 0, item; item = data.data[i++];) {
                    // item.id = item.id;
                    item.text = item.text || item.name;
                }
                if (params.page === 1) {
                    // data.data.unshift({id: '', text: '请选择'});
                }
                return {
                    results: data.data,
                    pagination: {
                        more: (params.page * data.pageSize) < data.totalRows,
                    },
                };
            },
            //字符转义处理
            escapeMarkup: function(markup) {
                return markup;
            },
            //返回列表结果回调
            templateResult: function(repo) {
                if (repo.loading) return repo.text;
                return repo.text;
            },
            //选中结果项回调
            templateSelection: function(repo) {
                return repo.text || '';
            },
        },
    });
    return $select;
};
prot.onChange = function(e) {
    var $target = $(e.target),
        id = +$target.val(),
        self = this;
    $target.closest('.area-select').nextAll('.area-select').remove();
    if (!id) return;
    cfg.$el.data('val', id);
    cfg.change(id);
    $.ajax({
        url: cfg.childUrl,
        type: 'get',
        data: {
            parentId: id,
            // startLevel: cfg.startLevel,
            endLevel: cfg.endLevel,
            currPage: 1,
            pageSize: 1,
        },
    }).success(function(result) {
        if (result.data.length) {
            self.createChild(id);
        }
    });
};
prot.bind = function() {
    cfg.$el.off('change', 'select');
    cfg.$el.on('change', 'select', this.onChange.bind(this));
};

module.exports = AreaSelector;
