import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSDProblemsRequest,
  saveSDProblemRequest,
  deleteSDProblemRequest,
} from '../../store/slices/sdProblemSlice';
import SDProblemList from './sd-problem/SDProblemList';
import SDProblemModal from './sd-problem/SDProblemModal';

export default function AdminSDProblemsPage() {
  const dispatch = useDispatch();
  const { problems, total, page, loading, saving } = useSelector((state) => state.sdProblem);
  const [selected, setSelected] = useState(null);
  const isModalOpen = selected !== null;

  useEffect(() => { dispatch(fetchSDProblemsRequest(1)); }, [dispatch]);

  const _handlePageChange = (targetPage) => dispatch(fetchSDProblemsRequest(targetPage));

  const _handleSave = (dto) => {
    dispatch(saveSDProblemRequest({ id: selected?.id ?? null, dto, currentPage: page }));
    setSelected(null);
  };

  const _handleDelete = (id) => {
    if (!confirm('Bạn có chắc muốn xóa problem này?')) return;
    dispatch(deleteSDProblemRequest({ id }));
  };

  return (
    <>
      <SDProblemList
        problems={problems}
        loading={loading}
        page={page}
        total={total}
        limit={10}
        onPageChange={_handlePageChange}
        onCreateNew={() => setSelected(undefined)}
        onEdit={(p) => setSelected(p)}
        onDelete={_handleDelete}
      />
      {isModalOpen && (
        <SDProblemModal
          problem={selected}
          saving={saving}
          onSave={_handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
