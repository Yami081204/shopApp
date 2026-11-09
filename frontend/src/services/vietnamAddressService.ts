export interface VietnamWard {
  code: string;
  name: string;
  postalCode: string;
}

export interface VietnamProvince {
  code: string;
  name: string;
}

interface DatasetWard {
  Code: string;
  FullName: string;
  PostalCode: string;
}

interface DatasetProvince {
  Code: string;
  FullName: string;
  Wards: DatasetWard[];
}

let datasetCache: DatasetProvince[] | null = null;

const loadDataset = async (signal?: AbortSignal): Promise<DatasetProvince[]> => {
  if (datasetCache) return datasetCache;

  const response = await fetch('/data/vietnam-address-data.json', { signal });
  if (!response.ok) throw new Error(`Không thể tải dữ liệu địa chỉ (HTTP ${response.status}).`);

  const data = await response.json() as DatasetProvince[];
  if (!Array.isArray(data) || data.some((province) =>
    typeof province.Code !== 'string' ||
    typeof province.FullName !== 'string' ||
    !Array.isArray(province.Wards) ||
    province.Wards.some((ward) =>
      typeof ward.Code !== 'string' ||
      typeof ward.FullName !== 'string' ||
      !/^\d{5}$/.test(ward.PostalCode)
    )
  )) {
    throw new Error('Dữ liệu tỉnh/thành, phường/xã hoặc mã bưu chính không hợp lệ.');
  }
  datasetCache = data;
  return data;
};

const getProvinces = async (signal?: AbortSignal): Promise<VietnamProvince[]> => {
  const data = await loadDataset(signal);
  return data
    .map(({ Code, FullName }) => ({ code: Code, name: FullName }))
    .sort((first, second) => first.name.localeCompare(second.name, 'vi'));
};

const getWards = async (provinceCode: string, signal?: AbortSignal): Promise<VietnamWard[]> => {
  const data = await loadDataset(signal);
  const province = data.find((item) => item.Code === provinceCode);
  if (!province) throw new Error('Không tìm thấy dữ liệu của tỉnh/thành đã chọn.');

  return province.Wards
    .map(({ Code, FullName, PostalCode }) => ({
      code: Code,
      name: FullName,
      postalCode: PostalCode
    }))
    .sort((first, second) => first.name.localeCompare(second.name, 'vi'));
};

export const vietnamAddressService = { getProvinces, getWards };
