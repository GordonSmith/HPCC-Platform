/*##############################################################################
    HPCC SYSTEMS software Copyright (C) 2022 HPCC Systems®.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
############################################################################## */

#ifndef _PARQUETEMBED_INCL
#define _PARQUETEMBED_INCL

#ifdef PARQUETEMBED_PLUGIN_EXPORTS
#define PARQUETEMBED_PLUGIN_API DECL_EXPORT
#else
#define PARQUETEMBED_PLUGIN_API DECL_IMPORT
#endif

// Platform includes
#include "hqlplugins.hpp"
#include "eclrtl_imp.hpp"
#include "eclhelper.hpp"
#include "tokenserialization.hpp"
#include "rtlfield.hpp"
#include "roxiemem.hpp"

namespace parquetembed
{
    extern void UNSUPPORTED(const char *feature) __attribute__((noreturn));
    extern void failx(const char *msg, ...) __attribute__((noreturn))  __attribute__((format(printf, 1, 2)));
    extern void fail(const char *msg) __attribute__((noreturn));

    enum PathNodeType {CPNTScalar, CPNTDataset, CPNTSet};

    struct PathTracker
    {
        StringBuffer nodeName;
        PathNodeType nodeType;
        unsigned int currentChildIndex;
        unsigned int childCount;
        unsigned int childrenProcessed;

        // Constructor given node name and dataset bool
        PathTracker(const StringBuffer& _nodeName, PathNodeType _nodeType)
            : nodeName(_nodeName), nodeType(_nodeType), currentChildIndex(0), childCount(0), childrenProcessed(0)
        {}

        // Copy constructor
        PathTracker(const PathTracker& other)
            : nodeName(other.nodeName), nodeType(other.nodeType), currentChildIndex(other.currentChildIndex), childCount(other.childCount), childrenProcessed(other.childrenProcessed)
        {}
    };

    /**
     * @brief Builds ECL Records from Parquet result rows.
     * 
     */
    class ParquetRowStream : public RtlCInterface, implements IRowStream
    {
    public:
        ParquetRowStream(IEngineRowAllocator* _resultAllocator);
        virtual ~ParquetRowStream();

        RTLIMPLEMENT_IINTERFACE
        virtual const void* nextRow();
        virtual void stop();
    private:
        Linked<IEngineRowAllocator> m_resultAllocator;      //!< Pointer to allocator used when building result rows.
        bool m_shouldRead;                                  //!< If true, we should continue trying to read more messages.
        __int64 m_currentRow;                               //!< Current result row.
    };

    /**
     * @brief Builds ECL records for ParquetRowStream.
     * 
     */
    class ParquetRowBuilder : public CInterfaceOf<IFieldSource>
    {
    public:
        ParquetRowBuilder(IPropertyTree * resultrow)
        {
            m_oResultRow.set(resultrow);
            if (!m_oResultRow)
                failx("Missing result row data");
            m_pathStack.reserve(10);
        }

        virtual bool getBooleanResult(const RtlFieldInfo *field);
        virtual void getDataResult(const RtlFieldInfo *field, size32_t &len, void * &result);
        virtual double getRealResult(const RtlFieldInfo *field);
        virtual __int64 getSignedResult(const RtlFieldInfo *field);
        virtual unsigned __int64 getUnsignedResult(const RtlFieldInfo *field);
        virtual void getStringResult(const RtlFieldInfo *field, size32_t &chars, char * &result);
        virtual void getUTF8Result(const RtlFieldInfo *field, size32_t &chars, char * &result);
        virtual void getUnicodeResult(const RtlFieldInfo *field, size32_t &chars, UChar * &result);
        virtual void getDecimalResult(const RtlFieldInfo *field, Decimal &value);
        virtual void processBeginSet(const RtlFieldInfo * field, bool &isAll);
        virtual bool processNextSet(const RtlFieldInfo * field);
        virtual void processBeginDataset(const RtlFieldInfo * field);
        virtual void processBeginRow(const RtlFieldInfo * field);
        virtual bool processNextRow(const RtlFieldInfo * field);
        virtual void processEndSet(const RtlFieldInfo * field);
        virtual void processEndDataset(const RtlFieldInfo * field);
        virtual void processEndRow(const RtlFieldInfo * field);

    protected:
        const char * nextField(const RtlFieldInfo * field);
        void xpathOrName(StringBuffer & outXPath, const RtlFieldInfo * field) const;
        void constructNewXPath(StringBuffer& outXPath, const char * nextNode) const;
    private:
        TokenDeserializer m_tokenDeserializer;
        Owned<IPropertyTree> m_oResultRow;
        std::vector<PathTracker> m_pathStack;
    };

    /**
     * @brief Binds ECL records to bson Documents
     * 
     */
    class ParquetRecordBinder : public CInterfaceOf<IFieldProcessor>
    {
    public:
        ParquetRecordBinder(const IContextLogger &_logctx, const RtlTypeInfo *_typeInfo, int _firstParam)
         : logctx(_logctx), typeInfo(_typeInfo), firstParam(_firstParam), dummyField("<row>", NULL, typeInfo), thisParam(_firstParam) 
        {
        }

        int numFields();
        void processRow(const byte *row);
        virtual void processString(unsigned len, const char *value, const RtlFieldInfo * field);
        virtual void processBool(bool value, const RtlFieldInfo * field);
        virtual void processData(unsigned len, const void *value, const RtlFieldInfo * field);
        virtual void processInt(__int64 value, const RtlFieldInfo * field);
        virtual void processUInt(unsigned __int64 value, const RtlFieldInfo * field);
        virtual void processReal(double value, const RtlFieldInfo * field);
        virtual void processDecimal(const void *value, unsigned digits, unsigned precision, const RtlFieldInfo * field);
        virtual void processUDecimal(const void *value, unsigned digits, unsigned precision, const RtlFieldInfo * field)
        {
            UNSUPPORTED("UNSIGNED decimals");
        }

        virtual void processUnicode(unsigned chars, const UChar *value, const RtlFieldInfo * field);
        virtual void processQString(unsigned len, const char *value, const RtlFieldInfo * field);
        virtual void processUtf8(unsigned chars, const char *value, const RtlFieldInfo * field);
        virtual bool processBeginSet(const RtlFieldInfo * field, unsigned numElements, bool isAll, const byte *data)
        {
            UNSUPPORTED("SET");
            return false;
        }
        virtual bool processBeginDataset(const RtlFieldInfo * field, unsigned numRows)
        {
            return false;
        }
        virtual bool processBeginRow(const RtlFieldInfo * field)
        {
            return true;
        }
        virtual void processEndSet(const RtlFieldInfo * field)
        {
            UNSUPPORTED("SET");
        }
        virtual void processEndDataset(const RtlFieldInfo * field)
        {
            UNSUPPORTED("DATASET");
        }
        virtual void processEndRow(const RtlFieldInfo * field)
        {
        }

    protected:
        inline unsigned checkNextParam(const RtlFieldInfo * field);

        const RtlTypeInfo *typeInfo = nullptr;
        const IContextLogger &logctx;
        int firstParam;
        RtlFieldStrInfo dummyField;
        int thisParam;
        TokenSerializer m_tokenSerializer;
    };

    /**
     * @brief Binds an ECL dataset to a vector of bson documents.
     * 
     */
    class ParquetDatasetBinder : public ParquetRecordBinder
    {
    public:
        /**
         * @brief Construct a new ParquetDataset Binder object
         * 
         * @param _logctx logger for building the dataset.
         * @param _input Stream of input of dataset.
         * @param _typeInfo Field type info.
         * @param _query Holds the builder object for creating the documents.
         * @param _firstParam Index of the first param.
         */
        ParquetDatasetBinder(const IContextLogger &_logctx, IRowStream * _input, const RtlTypeInfo *_typeInfo, int _firstParam)
          : input(_input), ParquetRecordBinder(_logctx, _typeInfo, _firstParam)
        {
        }

        /**
         * @brief Gets the next ECL row.
         * 
         * @return true If there is a row to process.
         * @return false If there are no rows left.
         */
        bool bindNext()
        {
            roxiemem::OwnedConstRoxieRow nextRow = (const byte *) input->ungroupedNextRow();
            if (!nextRow)
                return false;
            processRow((const byte *) nextRow.get());   // Bind the variables for the current row
            return true;
        }

        /**
         * @brief Binds all the rows of the dataset and executes the function.
         */
        void executeAll()
        {
        }

    protected:
        Owned<IRowStream> input;
    };

    /**
     * @brief Main interface for the engine to interact with the plugin. The get functions return results to the engine and the Rowstream and 
     * 
     */
    class ParquetEmbedFunctionContext : public CInterfaceOf<IEmbedFunctionContext>
    {
       public:
           ParquetEmbedFunctionContext(const IContextLogger &_logctx, const char *options, unsigned _flags);
           virtual ~ParquetEmbedFunctionContext();
           virtual bool getBooleanResult();
           virtual void getDataResult(size32_t &len, void * &result);
           virtual double getRealResult();
           virtual __int64 getSignedResult();
           virtual unsigned __int64 getUnsignedResult();
           virtual void getStringResult(size32_t &chars, char * &result);
           virtual void getUTF8Result(size32_t &chars, char * &result);
           virtual void getUnicodeResult(size32_t &chars, UChar * &result);
           virtual void getDecimalResult(Decimal &value);
           virtual void getSetResult(bool & __isAllResult, size32_t & __resultBytes, void * & __result, int elemType, size32_t elemSize)
           {
               UNSUPPORTED("SET results");
           }
           virtual IRowStream * getDatasetResult(IEngineRowAllocator * _resultAllocator);
           virtual byte * getRowResult(IEngineRowAllocator * _resultAllocator);
           virtual size32_t getTransformResult(ARowBuilder & rowBuilder);
           virtual void bindRowParam(const char *name, IOutputMetaData & metaVal, const byte *val) override;
           virtual void bindDatasetParam(const char *name, IOutputMetaData & metaVal, IRowStream * val);
           virtual void bindBooleanParam(const char *name, bool val);
           virtual void bindDataParam(const char *name, size32_t len, const void *val);
           virtual void bindFloatParam(const char *name, float val);
           virtual void bindRealParam(const char *name, double val);
           virtual void bindSignedSizeParam(const char *name, int size, __int64 val);
           virtual void bindSignedParam(const char *name, __int64 val);
           virtual void bindUnsignedSizeParam(const char *name, int size, unsigned __int64 val);
           virtual void bindUnsignedParam(const char *name, unsigned __int64 val);
           virtual void bindStringParam(const char *name, size32_t len, const char *val);
           virtual void bindVStringParam(const char *name, const char *val);
           virtual void bindUTF8Param(const char *name, size32_t chars, const char *val);
           virtual void bindUnicodeParam(const char *name, size32_t chars, const UChar *val);
           virtual void bindSetParam(const char *name, int elemType, size32_t elemSize, bool isAll, size32_t totalBytes, const void *setData)
           {
               UNSUPPORTED("SET parameters");
           }
           virtual IInterface *bindParamWriter(IInterface *esdl, const char *esdlservice, const char *esdltype, const char *name)
           {
               return NULL;
           }
           virtual void paramWriterCommit(IInterface *writer)
           {
               UNSUPPORTED("paramWriterCommit");
           }
           virtual void writeResult(IInterface *esdl, const char *esdlservice, const char *esdltype, IInterface *writer)
           {
               UNSUPPORTED("writeResult");
           }
           virtual void importFunction(size32_t lenChars, const char *text)
           {
               UNSUPPORTED("importFunction");
           }
           virtual void compileEmbeddedScript(size32_t chars, const char *script);
           virtual void callFunction();
           virtual void loadCompiledScript(size32_t chars, const void *_script) override
           {
               UNSUPPORTED("loadCompiledScript");
           }
           virtual void enter() override {}
           virtual void reenter(ICodeContext *codeCtx) override {}
           virtual void exit() override {}

       protected:
           void execute();
           unsigned countBindings(const char *query);
           const char * findUnquoted(const char *query, char searchFor);
           unsigned checkNextParam(const char *name);
           const IContextLogger &logctx;
           Owned<IPropertyTreeIterator> m_resultrow;

           int m_NextRow;                                   //! Next Row to process.
           Owned<ParquetDatasetBinder> m_oInputStream;      //! Input Stream used for building a dataset.

           TokenDeserializer m_tokenDeserializer;
           TokenSerializer m_tokenSerializer;
           unsigned m_nextParam;                            //! Index of the next parameter to process.
           unsigned m_numParams;                            //! Number of parameters in the function definition.
           unsigned m_scriptFlags;                          //! Count of flags raised by embedded script.
       };
}
#endif
